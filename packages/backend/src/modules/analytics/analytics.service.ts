import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalPlayers, totalMessages, messagesToday, activeChannels, onlineLast24h] = await Promise.all([
      this.prisma.player.count({ where: { tenantId } }),
      this.prisma.message.count({ where: { tenantId } }),
      this.prisma.message.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      this.prisma.channel.count({ where: { tenantId, isActive: true } }),
      this.prisma.player.count({
        where: { tenantId, lastSeenAt: { gte: new Date(Date.now() - 86400000) } },
      }),
    ]);

    return { totalPlayers, totalMessages, messagesToday, activeChannels, onlineLast24h };
  }

  async getMessageStats(tenantId: string, days: number = 7) {
    const since = new Date(Date.now() - days * 86400000);
    const messages = await this.prisma.message.groupBy({
      by: ['channelId'],
      where: { tenantId, createdAt: { gte: since } },
      _count: true,
    });

    const channels = await this.prisma.channel.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const channelMap = new Map(channels.map((c) => [c.id, c.name]));

    return messages.map((m) => ({
      channelId: m.channelId,
      channelName: channelMap.get(m.channelId) || 'Unknown',
      messageCount: m._count,
    }));
  }

  async getPlayerStats(tenantId: string) {
    const vipDistribution = await this.prisma.player.groupBy({
      by: ['vipStatus'],
      where: { tenantId },
      _count: true,
    });

    const levelRangesRaw = await this.prisma.$queryRaw<Array<{ range: string; count: bigint }>>`
      SELECT
        CASE
          WHEN level BETWEEN 1 AND 5 THEN '1-5'
          WHEN level BETWEEN 6 AND 10 THEN '6-10'
          WHEN level BETWEEN 11 AND 20 THEN '11-20'
          WHEN level BETWEEN 21 AND 30 THEN '21-30'
          ELSE '31+'
        END as range,
        COUNT(*) as count
      FROM "Player"
      WHERE "tenant_id" = ${tenantId}
      GROUP BY range
      ORDER BY range
    `;

    // Convert BigInt to Number for JSON serialization
    const levelRanges = levelRangesRaw.map((r) => ({
      range: r.range,
      count: Number(r.count),
    }));

    return { vipDistribution, levelRanges };
  }
}
