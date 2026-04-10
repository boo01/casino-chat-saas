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

  async recalculate(tenantId: string, period: LeaderboardPeriod = LeaderboardPeriod.WEEKLY) {
    const topPlayers = await this.prisma.player.findMany({
      where: { tenantId },
      orderBy: { totalWagered: 'desc' },
      take: 20,
      select: { id: true, totalWagered: true },
    });

    // Upsert top 20 entries
    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      await this.prisma.leaderboardEntry.upsert({
        where: {
          tenantId_playerId_period: {
            tenantId,
            playerId: player.id,
            period,
          },
        },
        update: {
          wagered: player.totalWagered,
          rank: i + 1,
        },
        create: {
          tenantId,
          playerId: player.id,
          period,
          wagered: player.totalWagered,
          rank: i + 1,
        },
      });
    }

    // Delete entries beyond rank 20 for this tenant+period
    const topPlayerIds = topPlayers.map((p) => p.id);
    await this.prisma.leaderboardEntry.deleteMany({
      where: {
        tenantId,
        period,
        playerId: { notIn: topPlayerIds },
      },
    });

    return this.getLeaderboard(tenantId, period, 20);
  }
}
