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
import { Logger, BadRequestException } from '@nestjs/common';
import { ChatService } from 'src/modules/chat/chat.service';
import { PlayerService } from 'src/modules/player/player.service';
import { ModerationService } from 'src/modules/moderation/moderation.service';
import { ChannelService } from 'src/modules/channel/channel.service';
import { RedisService } from 'src/common/redis/redis.service';
import { MessageType, MessageSource } from '@prisma/client';
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
    origin: 'http://localhost:3001',
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
  ) {}

  async afterInit(server: Server) {
    const redisClient = await this.redisService.getClient();
    const adapter = createAdapter(redisClient, redisClient);
    server.adapter(adapter);
    this.logger.log('Socket.io Redis adapter initialized');
  }

  async handleConnection(socket: Socket) {
    try {
      const { tenantId, token } = socket.handshake.auth;

      if (!tenantId) {
        this.logger.warn('Connection attempt without tenantId');
        socket.disconnect();
        return;
      }

      socket.data.tenantId = tenantId;
      socket.data.connectedAt = Date.now();

      if (token) {
        // Player connected with JWT
        socket.data.isGuest = false;
        this.logger.log(
          `Player connected: ${socket.id} (tenant: ${tenantId})`,
        );

        // Join user-specific room for direct messages
        socket.join(`user:${socket.data.player?.id}`);
      } else {
        // Guest connection (read-only)
        socket.data.isGuest = true;
        this.logger.log(`Guest connected: ${socket.id} (tenant: ${tenantId})`);
      }

      // Send connection confirmation
      socket.emit('connection:established', {
        socketId: socket.id,
        isGuest: socket.data.isGuest,
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const tenantId = socket.data.tenantId;
    const playerId = socket.data.player?.id;

    if (playerId) {
      await this.playerService.updateLastSeen(tenantId, playerId);

      // Broadcast user leaving all channels
      socket.broadcast.emit('player:disconnected', {
        playerId,
        username: socket.data.player?.username,
      });
    }

    this.logger.log(
      `Socket disconnected: ${socket.id} (tenant: ${tenantId})`,
    );
  }

  @SubscribeMessage('channel:join')
  async handleChannelJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const { tenantId, player, isGuest } = socket.data;
      const { channelId } = data;

      // Validate channel exists
      const channel = await this.channelService.getChannel(
        tenantId,
        channelId,
      );

      // Join channel room
      socket.join(`channel:${channelId}`);

      // Get message history
      const messages = await this.chatService.getChannelHistory(
        tenantId,
        channelId,
        100,
      );

      // Send history and presence
      socket.emit('channel:joined', {
        channelId,
        channel,
        messages,
        isGuest,
      });

      // Broadcast user presence
      if (!isGuest) {
        this.server.to(`channel:${channelId}`).emit('player:joined', {
          playerId: player.id,
          username: player.username,
          avatarUrl: player.avatarUrl,
        });
      }

      this.logger.log(`Player ${player?.id} joined channel ${channelId}`);
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

    if (!socket.data.isGuest) {
      this.server.to(`channel:${channelId}`).emit('player:left', {
        playerId: player.id,
        username: player.username,
      });
    }

    this.logger.log(`Player ${player?.id} left channel ${channelId}`);
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
        throw new BadRequestException('Guests cannot send messages');
      }

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new BadRequestException('Message content is required');
      }

      // Check if player is muted
      const isMuted = await this.moderationService.isPlayerMuted(
        tenantId,
        player.id,
      );

      if (isMuted) {
        socket.emit('error', { message: 'You are muted' });
        return;
      }

      // Check for banned words
      const contentCheck = await this.moderationService.checkContentForBannedWords(
        tenantId,
        text,
      );

      if (contentCheck.isBanned) {
        socket.emit('error', {
          message: 'Your message contains prohibited content',
        });
        return;
      }

      // Check rate limit
      const rateLimit = await this.chatService.getRateLimitStatus(
        tenantId,
        player.id,
      );

      if (rateLimit.isLimited) {
        socket.emit('error', {
          message: `Rate limited. Please wait ${rateLimit.resetIn}s`,
        });
        return;
      }

      // Create message
      const message = await this.chatService.sendMessage({
        tenantId,
        channelId,
        playerId: player.id,
        type: MessageType.TEXT,
        source: MessageSource.PLAYER,
        content: { text },
        replyToId,
      });

      // Broadcast to channel
      this.server.to(`channel:${channelId}`).emit('message:received', {
        id: message.id,
        playerId: player.id,
        username: player.username,
        avatarUrl: player.avatarUrl,
        vipStatus: player.vipStatus,
        isPremium: player.isPremium,
        premiumStyle: player.premiumStyle,
        isModerator: player.isModerator,
        isStreamer: player.isStreamer,
        type: message.type,
        content: message.content,
        replyToId,
        createdAt: message.createdAt,
        sequenceNum: message.sequenceNum.toString(),
      });

      this.logger.debug(
        `Message sent by ${player.username} in ${channelId}`,
      );
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

    if (!player) {
      return;
    }

    this.server.to(`channel:${channelId}`).emit('player:typing', {
      playerId: player.id,
      username: player.username,
      isTyping,
    });
  }

  @SubscribeMessage('presence:update')
  async handlePresenceUpdate(
    @ConnectedSocket() socket: Socket,
  ) {
    const { tenantId, player } = socket.data;

    if (player) {
      await this.playerService.updateLastSeen(tenantId, player.id);

      this.server.emit('player:presence', {
        playerId: player.id,
        lastSeenAt: new Date(),
      });
    }
  }
}
