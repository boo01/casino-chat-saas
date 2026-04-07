import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { LeaderboardPeriod } from '@prisma/client';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(tenantId: string, period: LeaderboardPeriod = LeaderboardPeriod.WEEKLY, limit: number = 20) {
    return this.prisma.leaderboardEntry.findMany({
      where: { tenantId, period },
      orderBy: { rank: 'asc' },
      take: limit,
      include: {
        player: {
          select: { id: true, username: true, avatarUrl: true, level: true, vipStatus: true },
        },
      },
    });
  }
}
