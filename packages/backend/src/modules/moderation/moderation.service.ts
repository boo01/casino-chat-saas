import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RedisService } from 'src/common/redis/redis.service';
import { BannedWordMatchType, ModerationAction } from '@prisma/client';
import { BannedWordDto } from './dto/banned-word.dto';
import { ModeratePlayerDto } from './dto/moderate-player.dto';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private prismaService: PrismaService,
    private redisService: RedisService,
  ) {}

  // Banned Words
  async addBannedWord(tenantId: string, bannedWordDto: BannedWordDto) {
    const bannedWord = await this.prismaService.bannedWord.create({
      data: {
        tenantId,
        word: bannedWordDto.word.toLowerCase(),
        matchType: bannedWordDto.matchType,
      },
    });

    // Cache banned words
    await this.cacheBannedWords(tenantId);

    this.logger.log(
      `Banned word added: ${bannedWordDto.word} for tenant ${tenantId}`,
    );

    return bannedWord;
  }

  async removeBannedWord(tenantId: string, wordId: string) {
    const bannedWord = await this.prismaService.bannedWord.findFirst({
      where: { id: wordId, tenantId },
    });

    if (!bannedWord) {
      throw new NotFoundException('Banned word not found');
    }

    await this.prismaService.bannedWord.delete({
      where: { id: wordId },
    });

    // Refresh cache
    await this.cacheBannedWords(tenantId);

    this.logger.log(`Banned word removed: ${bannedWord.word}`);
  }

  async listBannedWords(tenantId: string) {
    return this.prismaService.bannedWord.findMany({
      where: { tenantId },
    });
  }

  async checkContentForBannedWords(
    tenantId: string,
    content: string,
  ): Promise<{ isBanned: boolean; bannedWords: string[] }> {
    const bannedWords = await this.getBannedWordsFromCache(tenantId);

    if (bannedWords.length === 0) {
      return { isBanned: false, bannedWords: [] };
    }

    const foundWords: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const bannedWord of bannedWords) {
      if (this.matchesPattern(lowerContent, bannedWord)) {
        foundWords.push(bannedWord.word);
      }
    }

    return {
      isBanned: foundWords.length > 0,
      bannedWords: foundWords,
    };
  }

  // Moderation Actions
  async moderatePlayer(
    tenantId: string,
    adminId: string,
    playerId: string,
    moderatePlayerDto: ModeratePlayerDto,
  ) {
    const player = await this.prismaService.player.findFirst({
      where: { id: playerId, tenantId },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const admin = await this.prismaService.tenantAdmin.findFirst({
      where: { id: adminId, tenantId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Create moderation log
    const log = await this.prismaService.moderationLog.create({
      data: {
        tenantId,
        moderatorId: adminId,
        targetPlayerId: playerId,
        action: moderatePlayerDto.action,
        reason: moderatePlayerDto.reason,
        durationMinutes: moderatePlayerDto.durationMinutes,
      },
    });

    // Apply action
    switch (moderatePlayerDto.action) {
      case ModerationAction.MUTE:
        await this.redisService.set(
          `muted:${tenantId}:${playerId}`,
          '1',
          (moderatePlayerDto.durationMinutes || 60) * 60,
        );
        break;
      case ModerationAction.BAN:
        await this.prismaService.player.update({
          where: { id: playerId },
          data: { /* mark as banned somehow */ },
        });
        break;
      case ModerationAction.UNMUTE:
        await this.redisService.del(`muted:${tenantId}:${playerId}`);
        break;
    }

    this.logger.log(
      `Moderation action ${moderatePlayerDto.action} applied to ${playerId}`,
    );

    return log;
  }

  async isPlayerMuted(tenantId: string, playerId: string): Promise<boolean> {
    const isMuted = await this.redisService.get(
      `muted:${tenantId}:${playerId}`,
    );
    return !!isMuted;
  }

  async getModerationLogs(
    tenantId: string,
    playerId?: string,
    limit: number = 50,
  ) {
    return this.prismaService.moderationLog.findMany({
      where: {
        tenantId,
        targetPlayerId: playerId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Private helpers
  private async cacheBannedWords(tenantId: string) {
    const bannedWords = await this.prismaService.bannedWord.findMany({
      where: { tenantId },
    });

    const cacheKey = `banned-words:${tenantId}`;
    await this.redisService.del(cacheKey);

    if (bannedWords.length > 0) {
      const serialized = JSON.stringify(bannedWords);
      await this.redisService.set(cacheKey, serialized, 3600); // 1 hour
    }
  }

  private async getBannedWordsFromCache(tenantId: string) {
    const cacheKey = `banned-words:${tenantId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        this.logger.warn('Failed to parse cached banned words');
      }
    }

    // Fall back to database
    const bannedWords = await this.prismaService.bannedWord.findMany({
      where: { tenantId },
    });

    // Cache it
    if (bannedWords.length > 0) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(bannedWords),
        3600,
      );
    }

    return bannedWords;
  }

  private matchesPattern(content: string, bannedWord: any): boolean {
    const pattern = bannedWord.word;

    switch (bannedWord.matchType) {
      case BannedWordMatchType.EXACT:
        return content.includes(pattern);
      case BannedWordMatchType.WILDCARD:
        const regexPattern = pattern.replace(/\*/g, '.*');
        try {
          const regex = new RegExp(regexPattern, 'i');
          return regex.test(content);
        } catch {
          return false;
        }
      case BannedWordMatchType.REGEX:
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(content);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }
}
