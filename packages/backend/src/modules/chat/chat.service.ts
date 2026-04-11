import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RedisService } from 'src/common/redis/redis.service';
import { MessageType, MessageSource } from '@prisma/client';

interface SendMessagePayload {
  tenantId: string;
  channelId: string;
  playerId?: string | null;
  type?: MessageType;
  source?: MessageSource;
  content: Record<string, any>;
  replyToId?: string;
}

// Convert BigInt fields to strings for JSON serialization
function serializeMessage(msg: any): any {
  if (!msg) return msg;
  const player = msg.player || null;
  return {
    ...msg,
    sequenceNum: msg.sequenceNum?.toString?.() ?? msg.sequenceNum,
    // Flatten player data for widget consumption
    username: player?.username || (msg.source === 'OPERATOR' ? 'Admin' : msg.source === 'SYSTEM' ? 'System' : null),
    avatarUrl: player?.avatarUrl || null,
    level: player?.level ?? 0,
    vipStatus: player?.vipStatus || 'NONE',
    isPremium: player?.isPremium || false,
    premiumStyle: player?.premiumStyle || null,
    isModerator: player?.isModerator || msg.source === 'OPERATOR',
    isStreamer: player?.isStreamer || false,
  };
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prismaService: PrismaService,
    private redisService: RedisService,
  ) {}

  async sendMessage(payload: SendMessagePayload) {
    const {
      tenantId,
      channelId,
      playerId,
      type = MessageType.TEXT,
      source = MessageSource.PLAYER,
      content,
      replyToId,
    } = payload;

    // Validate channel exists
    const channel = await this.prismaService.channel.findFirst({
      where: { id: channelId, tenantId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Validate player exists if playerId provided
    if (playerId) {
      const player = await this.prismaService.player.findFirst({
        where: { id: playerId, tenantId },
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }
    }

    // Get next sequence number
    const sequenceKey = `chat:sequence:${tenantId}:${channelId}`;
    const sequenceNum = await this.redisService.incr(sequenceKey);

    // Create message
    const message = await this.prismaService.message.create({
      data: {
        tenantId,
        channelId,
        playerId,
        type,
        source,
        content,
        replyToId,
        sequenceNum: BigInt(sequenceNum),
      },
    });

    const serialized = serializeMessage(message);

    // Cache message in Redis
    const messageKey = `chat:message:${tenantId}:${channelId}:${message.id}`;
    await this.redisService.set(
      messageKey,
      JSON.stringify(serialized),
      86400,
    ); // 24h TTL

    // Add to channel message list
    const channelMessagesKey = `chat:messages:${tenantId}:${channelId}`;
    await this.redisService.lpush(
      channelMessagesKey,
      JSON.stringify(serialized),
    );

    // Trim to keep only last 1000 messages in Redis
    await this.redisService.ltrim(channelMessagesKey, 0, 999);

    this.logger.debug(`Message created: ${message.id}`);

    return serialized;
  }

  async getChannelHistory(
    tenantId: string,
    channelId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    // Try to get from Redis first
    const channelMessagesKey = `chat:messages:${tenantId}:${channelId}`;
    const cachedMessages = await this.redisService.lrange(
      channelMessagesKey,
      offset,
      offset + limit - 1,
    );

    if (cachedMessages.length > 0) {
      try {
        return cachedMessages.map((msg) => JSON.parse(msg));
      } catch (error) {
        this.logger.warn('Failed to parse cached messages');
      }
    }

    // Fall back to database
    const messages = await this.prismaService.message.findMany({
      where: { tenantId, channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        player: {
          select: {
            username: true,
            avatarUrl: true,
            level: true,
            vipStatus: true,
            isPremium: true,
            premiumStyle: true,
            isModerator: true,
            isStreamer: true,
          },
        },
      },
    });

    const serialized = messages.map(serializeMessage);

    // Cache results
    for (const message of serialized) {
      await this.redisService.lpush(
        channelMessagesKey,
        JSON.stringify(message),
      );
    }

    return serialized.reverse();
  }

  async searchMessages(
    tenantId: string,
    channelId: string,
    query: string,
    limit: number = 50,
  ) {
    // Use raw SQL for text search on JSON content field
    // content->>'text' extracts the text value from the JSON content column
    const messages = await this.prismaService.$queryRaw`
      SELECT * FROM "Message"
      WHERE "tenant_id" = ${tenantId}
        AND "channel_id" = ${channelId}
        AND "content"->>'text' ILIKE ${'%' + query + '%'}
      ORDER BY "created_at" DESC
      LIMIT ${limit}
    `;

    return messages;
  }

  async getMessageById(tenantId: string, messageId: string) {
    // Fall back to database directly — Redis GET doesn't support wildcards
    const cached: string | null = null;

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        this.logger.warn('Failed to parse cached message');
      }
    }

    // Fall back to database
    const message = await this.prismaService.message.findFirst({
      where: { id: messageId, tenantId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return serializeMessage(message);
  }

  async deleteMessage(tenantId: string, messageId: string) {
    const message = await this.prismaService.message.findFirst({
      where: { id: messageId, tenantId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.prismaService.message.delete({
      where: { id: messageId },
    });

    // Remove from cache
    const cacheKey = `chat:message:${tenantId}:${message.channelId}:${messageId}`;
    await this.redisService.del(cacheKey);

    this.logger.debug(`Message deleted: ${messageId}`);
  }

  async getRateLimitStatus(tenantId: string, playerId: string): Promise<{
    isLimited: boolean;
    messagesInWindow: number;
    resetIn: number;
  }> {
    const windowSeconds = 60;
    const maxMessagesPerWindow = 10;

    const key = `ratelimit:${tenantId}:${playerId}`;
    const count = await this.redisService.incr(key);

    if (count === 1) {
      await this.redisService.expire(key, windowSeconds);
    }

    const client = await this.redisService.getClient();
    const ttl = await client.pttl(key);

    return {
      isLimited: count > maxMessagesPerWindow,
      messagesInWindow: count,
      resetIn: Math.ceil(ttl / 1000),
    };
  }
}
