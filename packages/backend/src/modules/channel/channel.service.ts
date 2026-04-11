import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(private prismaService: PrismaService) {}

  async createChannel(tenantId: string, createChannelDto: CreateChannelDto) {
    const { name } = createChannelDto;

    // Check if channel with this name exists
    const existing = await this.prismaService.channel.findFirst({
      where: { tenantId, name },
    });

    if (existing) {
      throw new ConflictException(
        `Channel with name "${name}" already exists`,
      );
    }

    const channel = await this.prismaService.channel.create({
      data: {
        tenantId,
        name,
        emoji: createChannelDto.emoji || '💬',
        language: createChannelDto.language || 'en',
        description: createChannelDto.description || '',
        sortOrder: createChannelDto.sortOrder || 0,
        ...(createChannelDto.settings ? { settings: createChannelDto.settings } : {}),
      },
    });

    this.logger.log(
      `Channel created: ${channel.id} for tenant ${tenantId}`,
    );

    return channel;
  }

  async getChannel(tenantId: string, channelId: string) {
    const channel = await this.prismaService.channel.findFirst({
      where: { id: channelId, tenantId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async listChannels(tenantId: string) {
    return this.prismaService.channel.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateChannel(
    tenantId: string,
    channelId: string,
    updateChannelDto: UpdateChannelDto,
  ) {
    const channel = await this.getChannel(tenantId, channelId);

    const updated = await this.prismaService.channel.update({
      where: { id: channel.id },
      data: updateChannelDto,
    });

    this.logger.log(`Channel updated: ${channelId}`);

    return updated;
  }

  async deleteChannel(tenantId: string, channelId: string) {
    const channel = await this.getChannel(tenantId, channelId);

    await this.prismaService.channel.delete({
      where: { id: channel.id },
    });

    this.logger.log(`Channel deleted: ${channelId}`);
  }
}
