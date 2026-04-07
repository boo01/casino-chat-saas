import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RedisService } from 'src/common/redis/redis.service';
import { RainStatus } from '@prisma/client';

@Injectable()
export class RainService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async triggerRain(tenantId: string, data: {
    channelId: string;
    initiatedById: string;
    totalAmount: number;
    perPlayerAmount: number;
    durationSeconds: number;
    minLevel?: number;
    minWagered?: number;
  }) {
    const channel = await this.prisma.channel.findFirst({ where: { id: data.channelId, tenantId } });
    if (!channel) throw new NotFoundException('Channel not found');

    const rain = await this.prisma.rainEvent.create({
      data: {
        tenantId,
        channelId: data.channelId,
        initiatedById: data.initiatedById,
        totalAmount: data.totalAmount,
        perPlayerAmount: data.perPlayerAmount,
        durationSeconds: data.durationSeconds,
        minLevel: data.minLevel || 1,
        minWagered: data.minWagered || 0,
        status: RainStatus.ACTIVE,
      },
    });

    // Set expiry in Redis
    await this.redis.set(`rain:${tenantId}:${rain.id}`, JSON.stringify(rain), data.durationSeconds);

    return rain;
  }

  async claimRain(tenantId: string, rainId: string, playerId: string) {
    const rain = await this.prisma.rainEvent.findFirst({
      where: { id: rainId, tenantId, status: RainStatus.ACTIVE },
    });
    if (!rain) throw new NotFoundException('Active rain event not found');

    const player = await this.prisma.player.findFirst({ where: { id: playerId, tenantId } });
    if (!player) throw new NotFoundException('Player not found');

    if (player.level < rain.minLevel) {
      throw new BadRequestException(`Minimum level ${rain.minLevel} required`);
    }

    const existingClaim = await this.prisma.rainClaim.findUnique({
      where: { rainEventId_playerId: { rainEventId: rainId, playerId } },
    });
    if (existingClaim) throw new BadRequestException('Already claimed');

    const claim = await this.prisma.rainClaim.create({
      data: { rainEventId: rainId, playerId, amount: rain.perPlayerAmount },
    });

    await this.prisma.rainEvent.update({
      where: { id: rainId },
      data: { claimantCount: { increment: 1 } },
    });

    return claim;
  }

  async findAll(tenantId: string) {
    return this.prisma.rainEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { claims: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const rain = await this.prisma.rainEvent.findFirst({
      where: { id, tenantId },
      include: { claims: { include: { player: { select: { id: true, username: true } } } } },
    });
    if (!rain) throw new NotFoundException('Rain event not found');
    return rain;
  }
}
