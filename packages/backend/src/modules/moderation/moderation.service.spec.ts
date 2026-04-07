import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RedisService } from 'src/common/redis/redis.service';
import { ModerationAction } from '@prisma/client';

describe('ModerationService', () => {
  let service: ModerationService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        {
          provide: PrismaService,
          useValue: {
            bannedWord: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
            },
            moderationLog: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            player: { findFirst: jest.fn() },
            tenantAdmin: { findFirst: jest.fn() },
            playerBlock: {
              create: jest.fn(),
              deleteMany: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  describe('checkContentForBannedWords', () => {
    it('should detect exact match banned words', async () => {
      const bannedWords = [
        { word: 'scam', matchType: 'EXACT' },
        { word: 'cheat', matchType: 'EXACT' },
      ];
      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(bannedWords));

      const result = await service.checkContentForBannedWords(
        'tenant-1',
        'This is a scam and cheat',
      );

      expect(result.isBanned).toBe(true);
      expect(result.bannedWords).toContain('scam');
      expect(result.bannedWords).toContain('cheat');
    });

    it('should not flag clean content', async () => {
      const bannedWords = [{ word: 'scam', matchType: 'EXACT' }];
      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(bannedWords));

      const result = await service.checkContentForBannedWords(
        'tenant-1',
        'Hello everyone, nice game!',
      );

      expect(result.isBanned).toBe(false);
      expect(result.bannedWords).toHaveLength(0);
    });

    it('should detect wildcard pattern matches', async () => {
      const bannedWords = [{ word: 'hack*', matchType: 'WILDCARD' }];
      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(bannedWords));

      const result = await service.checkContentForBannedWords(
        'tenant-1',
        'I will hack this game',
      );

      expect(result.isBanned).toBe(true);
    });

    it('should return not banned when no banned words exist', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.bannedWord.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.checkContentForBannedWords(
        'tenant-1',
        'anything goes here',
      );

      expect(result.isBanned).toBe(false);
    });
  });

  describe('isPlayerMuted', () => {
    it('should return true when player is muted', async () => {
      (redisService.get as jest.Mock).mockResolvedValue('1');

      const result = await service.isPlayerMuted('tenant-1', 'player-1');

      expect(result).toBe(true);
    });

    it('should return false when player is not muted', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);

      const result = await service.isPlayerMuted('tenant-1', 'player-1');

      expect(result).toBe(false);
    });
  });

  describe('isPlayerBanned', () => {
    it('should return true from Redis cache', async () => {
      (redisService.get as jest.Mock).mockResolvedValue('1');

      const result = await service.isPlayerBanned('tenant-1', 'player-1');

      expect(result).toBe(true);
      expect(prismaService.playerBlock.findFirst).not.toHaveBeenCalled();
    });

    it('should fall back to database when not in cache', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.playerBlock.findFirst as jest.Mock).mockResolvedValue({
        isPermanent: true,
        blockedUntil: null,
      });

      const result = await service.isPlayerBanned('tenant-1', 'player-1');

      expect(result).toBe(true);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should return false when not banned anywhere', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.playerBlock.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.isPlayerBanned('tenant-1', 'player-1');

      expect(result).toBe(false);
    });
  });

  describe('moderatePlayer', () => {
    const mockPlayer = { id: 'player-1', tenantId: 'tenant-1' };
    const mockAdmin = { id: 'admin-1', tenantId: 'tenant-1' };
    const mockLog = { id: 'log-1', action: ModerationAction.MUTE };

    beforeEach(() => {
      (prismaService.player.findFirst as jest.Mock).mockResolvedValue(mockPlayer);
      (prismaService.tenantAdmin.findFirst as jest.Mock).mockResolvedValue(mockAdmin);
      (prismaService.moderationLog.create as jest.Mock).mockResolvedValue(mockLog);
    });

    it('should mute a player with TTL', async () => {
      await service.moderatePlayer('tenant-1', 'admin-1', 'player-1', {
        action: ModerationAction.MUTE,
        reason: 'Spamming',
        durationMinutes: 30,
      });

      expect(redisService.set).toHaveBeenCalledWith(
        'muted:tenant-1:player-1',
        '1',
        1800,
      );
    });

    it('should throw when player not found', async () => {
      (prismaService.player.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.moderatePlayer('tenant-1', 'admin-1', 'nonexistent', {
          action: ModerationAction.MUTE,
          reason: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unmute a player', async () => {
      await service.moderatePlayer('tenant-1', 'admin-1', 'player-1', {
        action: ModerationAction.UNMUTE,
        reason: 'Mute expired',
      });

      expect(redisService.del).toHaveBeenCalledWith('muted:tenant-1:player-1');
    });
  });

  describe('addBannedWord', () => {
    it('should create banned word and refresh cache', async () => {
      const mockWord = { id: 'word-1', word: 'badword', matchType: 'EXACT' };
      (prismaService.bannedWord.create as jest.Mock).mockResolvedValue(mockWord);
      (prismaService.bannedWord.findMany as jest.Mock).mockResolvedValue([mockWord]);

      const result = await service.addBannedWord('tenant-1', {
        word: 'badword',
        matchType: 'EXACT' as any,
      });

      expect(result).toEqual(mockWord);
      expect(redisService.del).toHaveBeenCalled();
    });
  });
});
