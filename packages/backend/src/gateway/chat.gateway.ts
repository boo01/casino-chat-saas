import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from 'src/modules/chat/chat.service';
import { PlayerService } from 'src/modules/player/player.service';
import { ModerationService } from 'src/modules/moderation/moderation.service';
import { ChannelService } from 'src/modules/channel/channel.service';
import { RedisService } from 'src/common/redis/redis.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { WebhookService } from 'src/modules/webhook/webhook.service';
import { MessageType, MessageSource, ReportCategory, TransactionStatus } from '@prisma/client';
import { createAdapter } from '@socket.io/redis-adapter';

interface ChatMessage {
  text: string;
  replyToId?: string;
}

interface TypingEvent {
  isTyping: boolean;
}

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private playerService: PlayerService,
    private moderationService: ModerationService,
    private channelService: ChannelService,
    private redisService: RedisService,
    private prismaService: PrismaService,
    private webhookService: WebhookService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /** Broadcast a message to all clients in a channel (used by REST API) */
  broadcastMessage(channelId: string, message: any) {
    this.server.to(`channel:${channelId}`).emit('message:received', message);
  }

  async afterInit() {
    try {
      const pubClient = await this.redisService.getPubClient();
      const subClient = await this.redisService.getSubClient();
      this.server.adapter(createAdapter(pubClient, subClient) as any);
      this.logger.log('Socket.io Redis adapter initialized');
    } catch (error) {
      this.logger.warn('Redis adapter setup failed, using default adapter:', error);
    }
  }

  async handleConnection(socket: Socket) {
    try {
      const { tenantId, token } = socket.handshake.auth;

      if (!tenantId) {
        this.logger.warn('Connection attempt without tenantId');
        socket.emit('error', { code: 'MISSING_TENANT', message: 'tenantId is required' });
        socket.disconnect();
        return;
      }

      // Check if tenant is active
      const tenant = await this.prismaService.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant || !tenant.isActive) {
        this.logger.warn(`Tenant ${tenantId} is suspended/missing, rejecting connection`);
        socket.emit('chat:error', { code: 'TENANT_SUSPENDED', message: 'Chat is temporarily disabled' });
        socket.disconnect(true);
        return;
      }

      socket.data.tenantId = tenantId;
      socket.data.connectedAt = Date.now();

      if (token) {
        try {
          // Verify JWT
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get<string>('jwt.secret'),
          });

          // Check if this is an admin token (has role + email, no externalId)
          if (payload.role && payload.email && !payload.externalId) {
            // Admin connecting to chat — create synthetic player data
            const adminPlayer = {
              id: payload.id,
              username: payload.email.split('@')[0],
              avatarUrl: null,
              level: 99,
              vipStatus: 'DIAMOND',
              isPremium: false,
              premiumStyle: null,
              isModerator: true,
              isStreamer: false,
            };

            socket.data.player = adminPlayer;
            socket.data.isGuest = false;
            socket.data.isAdmin = true;

            socket.join(`user:${payload.id}`);
            socket.join(`tenant:${tenantId}`);

            this.logger.log(`Admin ${payload.email} connected to chat: ${socket.id} (tenant: ${tenantId})`);
          } else {
            // Load player from DB
            const player = await this.playerService.getPlayerByExternalId(
              tenantId,
              payload.externalId || payload.playerId,
            );

            if (player) {
              // Check if player is banned
              const isBanned = await this.moderationService.isPlayerBanned(tenantId, player.id);
              if (isBanned) {
                socket.emit('error', { code: 'BANNED', message: 'You are banned from chat' });
                socket.disconnect();
                return;
              }

              socket.data.player = player;
              socket.data.isGuest = false;

              // Join user-specific room
              socket.join(`user:${player.id}`);
              socket.join(`tenant:${tenantId}`);

              // Update last seen
              await this.playerService.updateLastSeen(tenantId, player.id);

              this.logger.log(`Player ${player.username} connected: ${socket.id} (tenant: ${tenantId})`);
            } else {
              // Token valid but player not found — treat as guest
              socket.data.isGuest = true;
              socket.join(`tenant:${tenantId}`);
              this.logger.log(`Unknown player connected as guest: ${socket.id}`);
            }
          }
        } catch (err) {
          // Invalid token — connect as guest
          socket.data.isGuest = true;
          socket.join(`tenant:${tenantId}`);
          this.logger.warn(`Invalid JWT, connecting as guest: ${(err as Error).message}`);
        }
      } else {
        // Guest connection (read-only)
        socket.data.isGuest = true;
        socket.join(`tenant:${tenantId}`);
        this.logger.log(`Guest connected: ${socket.id} (tenant: ${tenantId})`);
      }

      // Fetch tenant channels
      const channels = await this.channelService.listChannels(tenantId);

      // Send connection confirmation with channels
      socket.emit('connection:established', {
        socketId: socket.id,
        isGuest: socket.data.isGuest,
        channels,
        player: socket.data.player
          ? {
              id: socket.data.player.id,
              username: socket.data.player.username,
              avatarUrl: socket.data.player.avatarUrl,
              level: socket.data.player.level,
              vipStatus: socket.data.player.vipStatus,
              isPremium: socket.data.player.isPremium,
              premiumStyle: socket.data.player.premiumStyle,
              isModerator: socket.data.player.isModerator,
              isStreamer: socket.data.player.isStreamer,
            }
          : null,
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const tenantId = socket.data.tenantId;
    const player = socket.data.player;

    if (player && !socket.data.isAdmin) {
      try {
        await this.playerService.updateLastSeen(tenantId, player.id);
      } catch (err) {
        this.logger.warn(`Failed to update lastSeen for ${player.id}: ${(err as Error).message}`);
      }

      // Broadcast to tenant
      this.server.to(`tenant:${tenantId}`).emit('player:disconnected', {
        playerId: player.id,
        username: player.username,
      });
    }

    this.logger.log(`Socket disconnected: ${socket.id} (tenant: ${tenantId})`);
  }

  @SubscribeMessage('channel:join')
  async handleChannelJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const { tenantId, player, isGuest } = socket.data;
      const { channelId } = data;

      const channel = await this.channelService.getChannel(tenantId, channelId);

      // Enforce channel access rules from settings
      const settings = (channel.settings as any) || {};
      const minLevel = settings.minLevel || 0;

      if (!socket.data.isAdmin && !isGuest && player) {
        if (minLevel > 0 && player.level < minLevel) {
          socket.emit('error', {
            code: 'CHANNEL_RESTRICTED',
            message: `This channel requires level ${minLevel}+`,
          });
          return;
        }
      }

      socket.join(`channel:${channelId}`);

      const messages = await this.chatService.getChannelHistory(tenantId, channelId, 100);

      // Get online count for this channel
      const sockets = await this.server.in(`channel:${channelId}`).fetchSockets();
      const onlineCount = sockets.length;

      socket.emit('channel:joined', {
        channelId,
        channel,
        messages,
        onlineCount,
        isGuest,
      });

      if (!isGuest && player) {
        this.server.to(`channel:${channelId}`).emit('player:joined', {
          playerId: player.id,
          username: player.username,
          avatarUrl: player.avatarUrl,
          level: player.level,
          vipStatus: player.vipStatus,
        });
      }

      this.logger.log(`${player?.username || 'Guest'} joined channel ${channelId}`);
    } catch (error) {
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to join channel' });
    }
  }

  @SubscribeMessage('channel:leave')
  async handleChannelLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { player } = socket.data;
    const { channelId } = data;

    socket.leave(`channel:${channelId}`);

    if (!socket.data.isGuest && player) {
      this.server.to(`channel:${channelId}`).emit('player:left', {
        playerId: player.id,
        username: player.username,
      });
    }
  }

  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ChatMessage & { channelId: string },
  ) {
    try {
      const { tenantId, player, isGuest } = socket.data;
      const { channelId, text, replyToId } = data;

      if (isGuest) {
        socket.emit('error', { code: 'GUEST_READONLY', message: 'Guests cannot send messages' });
        return;
      }

      if (!player) {
        socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
        return;
      }

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      if (text.length > 500) {
        socket.emit('error', { message: 'Message too long (max 500 characters)' });
        return;
      }

      // Admins bypass moderation checks
      if (!socket.data.isAdmin) {
        // Check mute
        const isMuted = await this.moderationService.isPlayerMuted(tenantId, player.id);
        if (isMuted) {
          socket.emit('error', { code: 'MUTED', message: 'You are muted' });
          return;
        }

        // Check banned words
        const contentCheck = await this.moderationService.checkContentForBannedWords(tenantId, text);
        if (contentCheck.isBanned) {
          socket.emit('error', { code: 'BANNED_CONTENT', message: 'Your message contains prohibited content' });
          return;
        }

        // Check rate limit
        const rateLimit = await this.chatService.getRateLimitStatus(tenantId, player.id);
        if (rateLimit.isLimited) {
          socket.emit('error', {
            code: 'RATE_LIMITED',
            message: `Rate limited. Please wait ${rateLimit.resetIn}s`,
            resetIn: rateLimit.resetIn,
          });
          return;
        }
      }

      const message = await this.chatService.sendMessage({
        tenantId,
        channelId,
        playerId: socket.data.isAdmin ? null : player.id,
        type: MessageType.TEXT,
        source: socket.data.isAdmin ? MessageSource.OPERATOR : MessageSource.PLAYER,
        content: { text: text.trim() },
        replyToId,
      });

      // Enrich reply-to data if this is a reply
      let replyTo: { id: string; username: string; text: string } | null = null;
      if (replyToId) {
        try {
          const replyMsg = await this.prismaService.message.findFirst({
            where: { id: replyToId, tenantId },
            include: {
              player: { select: { username: true } },
            },
          });
          if (replyMsg) {
            const replyContent = replyMsg.content as any;
            replyTo = {
              id: replyMsg.id,
              username: replyMsg.player?.username || (replyMsg.source === 'OPERATOR' ? 'Admin' : 'System'),
              text: replyContent?.text || '',
            };
          }
        } catch (err) {
          this.logger.warn(`Failed to fetch replyTo message ${replyToId}: ${(err as Error).message}`);
        }
      }

      this.server.to(`channel:${channelId}`).emit('message:received', {
        id: message.id,
        playerId: player.id,
        username: player.username,
        avatarUrl: player.avatarUrl,
        level: player.level,
        vipStatus: player.vipStatus,
        isPremium: player.isPremium,
        premiumStyle: player.premiumStyle,
        isModerator: player.isModerator,
        isStreamer: player.isStreamer,
        type: message.type,
        content: message.content,
        replyToId,
        replyTo,
        createdAt: message.createdAt,
        sequenceNum: message.sequenceNum.toString(),
      });
    } catch (error) {
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to send message' });
    }
  }

  @SubscribeMessage('chat:typing')
  handleTypingIndicator(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: TypingEvent & { channelId: string },
  ) {
    const { player } = socket.data;
    const { channelId, isTyping } = data;

    if (!player) return;

    socket.to(`channel:${channelId}`).emit('player:typing', {
      playerId: player.id,
      username: player.username,
      isTyping,
    });
  }

  @SubscribeMessage('rain:claim')
  async handleRainClaim(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { rainId: string },
  ) {
    try {
      const { tenantId, player, isGuest } = socket.data;

      if (isGuest || !player) {
        socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Authentication required to claim rain' });
        return;
      }

      // Check if rain is still active in Redis
      const rainData = await this.redisService.get(`rain:${tenantId}:${data.rainId}`);
      if (!rainData) {
        socket.emit('error', { code: 'RAIN_EXPIRED', message: 'Rain event has ended' });
        return;
      }

      // Emit claim to the player
      socket.emit('rain:claimed', {
        rainId: data.rainId,
        playerId: player.id,
        username: player.username,
      });

      // Broadcast to channel
      this.server.to(`tenant:${tenantId}`).emit('rain:claimed', {
        rainId: data.rainId,
        playerId: player.id,
        username: player.username,
      });
    } catch (error) {
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to claim rain' });
    }
  }

  @SubscribeMessage('trivia:answer')
  async handleTriviaAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { triviaId: string; answerIndex: number },
  ) {
    const { tenantId, player } = socket.data;

    if (!player) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    // Broadcast answer to tenant
    this.server.to(`tenant:${tenantId}`).emit('trivia:answered', {
      triviaId: data.triviaId,
      playerId: player.id,
      username: player.username,
      answerIndex: data.answerIndex,
    });
  }

  @SubscribeMessage('presence:update')
  async handlePresenceUpdate(@ConnectedSocket() socket: Socket) {
    const { tenantId, player } = socket.data;

    if (player && !socket.data.isAdmin) {
      try {
        await this.playerService.updateLastSeen(tenantId, player.id);
      } catch (err) {
        this.logger.warn(`Failed to update presence for ${player.id}: ${(err as Error).message}`);
      }

      this.server.to(`tenant:${tenantId}`).emit('player:presence', {
        playerId: player.id,
        lastSeenAt: new Date(),
      });
    }
  }

  @SubscribeMessage('chat:like')
  async handleChatLike(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; channelId: string },
  ) {
    try {
      const { tenantId, player, isGuest } = socket.data;
      const { messageId, channelId } = data;

      if (isGuest) {
        socket.emit('error', { code: 'GUEST_READONLY', message: 'Guests cannot like messages' });
        return;
      }

      if (!player) {
        socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
        return;
      }

      if (!messageId) {
        socket.emit('error', { message: 'messageId is required' });
        return;
      }

      const likesKey = `${tenantId}:msg:${messageId}:likes`;
      const playerId = player.id;

      // Toggle like: if already liked, remove; otherwise, add
      const alreadyLiked = await this.redisService.sismember(likesKey, playerId);

      if (alreadyLiked) {
        await this.redisService.srem(likesKey, playerId);
      } else {
        await this.redisService.sadd(likesKey, playerId);
      }

      const likesCount = await this.redisService.scard(likesKey);

      // Broadcast to the channel
      this.server.to(`channel:${channelId}`).emit('message:liked', {
        messageId,
        likesCount,
        playerId,
        action: alreadyLiked ? 'unliked' : 'liked',
      });

      this.logger.debug(`Player ${player.username} ${alreadyLiked ? 'unliked' : 'liked'} message ${messageId}`);
    } catch (error) {
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to like message' });
    }
  }

  @SubscribeMessage('chat:report')
  async handleChatReport(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; playerId: string; reason: string; category: string },
  ) {
    try {
      const { tenantId, player, isGuest } = socket.data;

      if (isGuest) {
        socket.emit('error', { code: 'GUEST_READONLY', message: 'Guests cannot submit reports' });
        return;
      }

      if (!player) {
        socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
        return;
      }

      const { messageId, playerId: reportedPlayerId, reason, category } = data;

      if (!reportedPlayerId || !reason || !category) {
        socket.emit('error', { message: 'playerId, reason, and category are required' });
        return;
      }

      // Validate category against ReportCategory enum
      const validCategories: string[] = Object.values(ReportCategory);
      if (!validCategories.includes(category)) {
        socket.emit('error', {
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        });
        return;
      }

      // Create report in database
      const report = await this.prismaService.report.create({
        data: {
          tenantId,
          reporterId: player.id,
          reportedPlayerId,
          messageId: messageId || null,
          reason,
          category: category as ReportCategory,
        },
      });

      // Emit confirmation back to the reporting player
      socket.emit('report:submitted', {
        reportId: report.id,
        messageId: messageId || null,
      });

      this.logger.log(`Report ${report.id} created by ${player.username} against player ${reportedPlayerId}`);
    } catch (error) {
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to submit report' });
    }
  }

  @SubscribeMessage('tip:send')
  async handleTipSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      targetPlayerId: string;
      amount: number;
      currency: string;
      channelId: string;
      isPublic: boolean;
    },
  ) {
    try {
      const { tenantId, player, isGuest } = socket.data;

      if (isGuest) {
        socket.emit('error', { code: 'GUEST_READONLY', message: 'Guests cannot send tips' });
        return;
      }

      if (!player) {
        socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
        return;
      }

      const { targetPlayerId, amount, currency, channelId, isPublic } = data;

      // Validate input
      if (!targetPlayerId || !currency || !channelId) {
        socket.emit('error', { message: 'targetPlayerId, currency, and channelId are required' });
        return;
      }

      if (typeof amount !== 'number' || amount <= 0) {
        socket.emit('error', { message: 'Amount must be a positive number' });
        return;
      }

      if (targetPlayerId === player.id) {
        socket.emit('error', { message: 'You cannot tip yourself' });
        return;
      }

      // Look up receiver
      const receiver = await this.prismaService.player.findFirst({
        where: { id: targetPlayerId, tenantId },
      });

      if (!receiver) {
        socket.emit('error', { message: 'Recipient player not found' });
        return;
      }

      // Create PENDING TipTransaction
      const tipTransaction = await this.prismaService.tipTransaction.create({
        data: {
          tenantId,
          senderId: player.id,
          receiverId: targetPlayerId,
          amount,
          currency,
          status: TransactionStatus.PENDING,
          isPublic: isPublic ?? true,
        },
      });

      // Send webhook to casino for approval
      const result = await this.webhookService.sendTipWebhook(tenantId, {
        senderId: player.id,
        receiverId: targetPlayerId,
        amount,
        currency,
        tipId: tipTransaction.id,
      });

      if (result.approved) {
        // Update to COMPLETED
        await this.prismaService.tipTransaction.update({
          where: { id: tipTransaction.id },
          data: {
            status: TransactionStatus.COMPLETED,
            casinoTxId: result.txId || null,
          },
        });

        // If public, broadcast a TIP message to the channel
        if (isPublic) {
          const tipContent = {
            fromPlayer: player.username,
            toPlayer: receiver.username,
            tipAmount: amount,
            tipCurrency: currency,
          };

          const message = await this.chatService.sendMessage({
            tenantId,
            channelId,
            playerId: player.id,
            type: MessageType.TIP,
            source: MessageSource.SYSTEM,
            content: tipContent,
          });

          this.server.to(`channel:${channelId}`).emit('message:received', {
            id: message.id,
            playerId: player.id,
            username: player.username,
            avatarUrl: player.avatarUrl,
            level: player.level,
            vipStatus: player.vipStatus,
            isPremium: player.isPremium,
            premiumStyle: player.premiumStyle,
            isModerator: player.isModerator,
            isStreamer: player.isStreamer,
            type: MessageType.TIP,
            content: tipContent,
            createdAt: message.createdAt,
            sequenceNum: message.sequenceNum.toString(),
          });
        }

        // Emit success to sender
        socket.emit('tip:success', {
          tipId: tipTransaction.id,
          amount,
          currency,
          toPlayer: receiver.username,
        });

        this.logger.log(
          `Tip ${tipTransaction.id}: ${player.username} → ${receiver.username} (${amount} ${currency})`,
        );
      } else {
        // Update to FAILED
        await this.prismaService.tipTransaction.update({
          where: { id: tipTransaction.id },
          data: { status: TransactionStatus.FAILED },
        });

        socket.emit('tip:failed', {
          tipId: tipTransaction.id,
          reason: result.reason || 'Tip declined by casino',
        });

        this.logger.log(
          `Tip ${tipTransaction.id} declined: ${result.reason}`,
        );
      }
    } catch (error) {
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to process tip',
      });
    }
  }

  @SubscribeMessage('tip:currencies')
  async handleTipCurrencies(@ConnectedSocket() socket: Socket) {
    try {
      const { tenantId } = socket.data;

      const tenantCurrencies = await this.prismaService.tenantCurrency.findMany({
        where: { tenantId, isActive: true },
        include: {
          currency: {
            select: { code: true, name: true, symbol: true, type: true },
          },
        },
        orderBy: { currency: { sortOrder: 'asc' } },
      });

      const currencies = tenantCurrencies.map((tc) => ({
        code: tc.currency.code,
        name: tc.currency.name,
        symbol: tc.currency.symbol,
        type: tc.currency.type,
      }));

      socket.emit('tip:currencies', { currencies });
    } catch (error) {
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to fetch currencies',
      });
    }
  }

  // Public methods for broadcasting from other services
  broadcastToChannel(channelId: string, event: string, data: any) {
    this.server.to(`channel:${channelId}`).emit(event, data);
  }

  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  broadcastToPlayer(playerId: string, event: string, data: any) {
    this.server.to(`user:${playerId}`).emit(event, data);
  }
}
