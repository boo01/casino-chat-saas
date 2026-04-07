import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RedisService } from 'src/common/redis/redis.service';

describe('ChatService', () => {
  let service: ChatService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockChannel = {
    id: 'channel-1',
    tenantId: 'tenant-1',
    name: 'English',
    isActive: true,
  };

  const mockPlayer = {
    id: 'player-1',
    tenantId: 'tenant-1',
    username: 'TestPlayer',
  };

  const mockMessage = {
    id: 'msg-1',
    tenantId: 'tenant-1',
    channelId: 'channel-1',
    playerId: 'player-1',
    type: 'TEXT',
    source: 'PLAYER',
    content: { text: 'Hello world' },
    sequenceNum: 1,
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: {
            channel: { findFirst: jest.fn() },
            player: { findFirst: jest.fn() },
            message: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
            lpush: jest.fn(),
            ltrim: jest.fn(),
            lrange: jest.fn(),
            getClient: jest.fn().mockResolvedValue({ pttl: jest.fn().mockResolvedValue(55000) }),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  describe('sendMessage', () => {
    it('should create and cache a message', async () => {
      (prismaService.channel.findFirst as jest.Mock).mockResolvedValue(mockChannel);
      (prismaService.player.findFirst as jest.Mock).mockResolvedValue(mockPlayer);
      (prismaService.message.create as jest.Mock).mockResolvedValue(mockMessage);
      (redisService.incr as jest.Mock).mockResolvedValue(1);

      const result = await service.sendMessage({
        tenantId: 'tenant-1',
        channelId: 'channel-1',
        playerId: 'player-1',
        content: { text: 'Hello world' },
      });

      expect(result.id).toEqual(mockMessage.id);
      expect(prismaService.message.create).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
      expect(redisService.lpush).toHaveBeenCalled();
      expect(redisService.ltrim).toHaveBeenCalled();
    });

    it('should throw if channel not found', async () => {
      (prismaService.channel.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.sendMessage({
          tenantId: 'tenant-1',
          channelId: 'nonexistent',
          content: { text: 'test' },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if player not found', async () => {
      (prismaService.channel.findFirst as jest.Mock).mockResolvedValue(mockChannel);
      (prismaService.player.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.sendMessage({
          tenantId: 'tenant-1',
          channelId: 'channel-1',
          playerId: 'nonexistent',
          content: { text: 'test' },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return not limited when under threshold', async () => {
      (redisService.incr as jest.Mock).mockResolvedValue(5);

      const result = await service.getRateLimitStatus('tenant-1', 'player-1');

      expect(result.isLimited).toBe(false);
      expect(result.messagesInWindow).toBe(5);
    });

    it('should set expiry on first message', async () => {
      (redisService.incr as jest.Mock).mockResolvedValue(1);

      await service.getRateLimitStatus('tenant-1', 'player-1');

      expect(redisService.expire).toHaveBeenCalledWith(
        'ratelimit:tenant-1:player-1',
        60,
      );
    });

    it('should return limited when over threshold', async () => {
      (redisService.incr as jest.Mock).mockResolvedValue(11);

      const result = await service.getRateLimitStatus('tenant-1', 'player-1');

      expect(result.isLimited).toBe(true);
      expect(result.messagesInWindow).toBe(11);
    });
  });

  describe('getChannelHistory', () => {
    it('should return cached messages when available', async () => {
      const cachedMsg = { ...mockMessage };
      const cached = [JSON.stringify(cachedMsg)];
      (redisService.lrange as jest.Mock).mockResolvedValue(cached);

      const result = await service.getChannelHistory('tenant-1', 'channel-1', 50);

      expect(result).toEqual([cachedMsg]);
      expect(prismaService.message.findMany).not.toHaveBeenCalled();
    });

    it('should fall back to database when cache is empty', async () => {
      (redisService.lrange as jest.Mock).mockResolvedValue([]);
      // Use a serializable mock (no BigInt) for the DB result
      (prismaService.message.findMany as jest.Mock).mockResolvedValue([mockMessage]);

      const result = await service.getChannelHistory('tenant-1', 'channel-1', 50);

      expect(result).toHaveLength(1);
      expect(prismaService.message.findMany).toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('should delete message and remove from cache', async () => {
      (prismaService.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);

      await service.deleteMessage('tenant-1', 'msg-1');

      expect(prismaService.message.delete).toHaveBeenCalledWith({ where: { id: 'msg-1' } });
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw if message not found', async () => {
      (prismaService.message.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteMessage('tenant-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
