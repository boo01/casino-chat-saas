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
  playerId?: string;
  type?: MessageType;
  source?: MessageSource;
  content: Record<string, any>;
  replyToId?: string;
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

    // Cache message in Redis
    const messageKey = `chat:message:${tenantId}:${channelId}:${message.id}`;
    await this.redisService.set(
      messageKey,
      JSON.stringify(message),
      86400,
    ); // 24h TTL

    // Add to channel message list
    const channelMessagesKey = `chat:messages:${tenantId}:${channelId}`;
    await this.redisService.lpush(
      channelMessagesKey,
      JSON.stringify(message),
    );

    // Trim to keep only last 1000 messages in Redis
    await this.redisService.ltrim(channelMessagesKey, 0, 999);

    this.logger.debug(`Message created: ${message.id}`);

    return message;
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
    });

    // Cache results
    for (const message of messages) {
      await this.redisService.lpush(
        channelMessagesKey,
        JSON.stringify(message),
      );
    }

    return messages.reverse();
  }

  async searchMessages(
    tenantId: string,
    channelId: string,
    query: string,
    limit: number = 50,
  ) {
    // Simple text search in content
    const messages = await this.prismaService.message.findMany({
      where: {
        tenantId,
        channelId,
        content: {
          search: query,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages;
  }

  async getMessageById(tenantId: string, messageId: string) {
    // Try cache first
    const cacheKey = `chat:message:${tenantId}:*:${messageId}`;
    const cached = await this.redisService.get(cacheKey);

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

    return message;
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
