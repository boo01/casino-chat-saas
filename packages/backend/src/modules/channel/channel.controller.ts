import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelService } from './channel.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentPlayer } from 'src/common/decorators/player.decorator';

@ApiTags('channels')
@Controller('api/channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class ChannelController {
  constructor(private channelService: ChannelService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new channel' })
  async createChannel(
    @CurrentPlayer() player: any,
    @Body() createChannelDto: CreateChannelDto,
  ) {
    return this.channelService.createChannel(
      player.tenantId,
      createChannelDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all channels' })
  async listChannels(@CurrentPlayer() player: any) {
    return this.channelService.listChannels(player.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  async getChannel(
    @CurrentPlayer() player: any,
    @Param('id') id: string,
  ) {
    return this.channelService.getChannel(player.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update channel' })
  async updateChannel(
    @CurrentPlayer() player: any,
    @Param('id') id: string,
    @Body() updateChannelDto: UpdateChannelDto,
  ) {
    return this.channelService.updateChannel(
      player.tenantId,
      id,
      updateChannelDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete channel' })
  async deleteChannel(
    @CurrentPlayer() player: any,
    @Param('id') id: string,
  ) {
    return this.channelService.deleteChannel(player.tenantId, id);
  }
}
