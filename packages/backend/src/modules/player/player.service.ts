import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { BlockPlayerDto } from './dto/block-player.dto';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(private prismaService: PrismaService) {}

  async upsertPlayer(
    tenantId: string,
    externalId: string,
    data: { username: string; avatarUrl?: string },
  ) {
    const player = await this.prismaService.player.upsert({
      where: {
        tenantId_externalId: {
          tenantId,
          externalId,
        },
      },
      create: {
        tenantId,
        externalId,
        username: data.username,
        avatarUrl: data.avatarUrl,
      },
      update: {
        username: data.username,
        avatarUrl: data.avatarUrl,
        lastSeenAt: new Date(),
      },
    });

    return player;
  }

  async getPlayer(tenantId: string, playerId: string) {
    const player = await this.prismaService.player.findFirst({
      where: { id: playerId, tenantId },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }

  async getPlayerByExternalId(tenantId: string, externalId: string) {
    const player = await this.prismaService.player.findUnique({
      where: {
        tenantId_externalId: {
          tenantId,
          externalId,
        },
      },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }

  async listPlayers(tenantId: string) {
    return this.prismaService.player.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePlayer(
    tenantId: string,
    playerId: string,
    updatePlayerDto: UpdatePlayerDto,
  ) {
    const player = await this.getPlayer(tenantId, playerId);

    const updated = await this.prismaService.player.update({
      where: { id: player.id },
      data: updatePlayerDto,
    });

    this.logger.log(`Player updated: ${playerId}`);

    return updated;
  }

  async blockPlayer(tenantId: string, playerId: string, blockPlayerDto: BlockPlayerDto) {
    const player = await this.getPlayer(tenantId, playerId);
    const blockedPlayer = await this.getPlayer(tenantId, blockPlayerDto.playerId);

    if (player.id === blockedPlayer.id) {
      throw new BadRequestException('Cannot block yourself');
    }

    const block = await this.prismaService.playerBlock.create({
      data: {
        tenantId,
        playerId: blockedPlayer.id,
        blockedByPlayerId: player.id,
        reason: blockPlayerDto.reason,
        isPermanent: blockPlayerDto.isPermanent || false,
        blockedUntil: blockPlayerDto.blockedUntil
          ? new Date(blockPlayerDto.blockedUntil)
          : null,
      },
    });

    this.logger.log(
      `Player ${blockedPlayer.id} blocked by ${player.id}`,
    );

    return block;
  }

  async unblockPlayer(tenantId: string, playerId: string, blockedPlayerId: string) {
    const block = await this.prismaService.playerBlock.findFirst({
      where: {
        tenantId,
        playerId: blockedPlayerId,
        blockedByPlayerId: playerId,
      },
    });

    if (!block) {
      throw new NotFoundException('Block relationship not found');
    }

    await this.prismaService.playerBlock.delete({
      where: { id: block.id },
    });

    this.logger.log(
      `Player ${blockedPlayerId} unblocked by ${playerId}`,
    );
  }

  async isPlayerBlocked(tenantId: string, playerId: string, by: string): Promise<boolean> {
    const block = await this.prismaService.playerBlock.findFirst({
      where: {
        tenantId,
        playerId,
        blockedByPlayerId: by,
      },
    });

    if (!block) {
      return false;
    }

    // Check if block expired
    if (block.blockedUntil && block.blockedUntil < new Date()) {
      await this.prismaService.playerBlock.delete({
        where: { id: block.id },
      });
      return false;
    }

    return true;
  }

  async updateLastSeen(_tenantId: string, playerId: string) {
    await this.prismaService.player.update({
      where: { id: playerId },
      data: { lastSeenAt: new Date() },
    });
  }
}
