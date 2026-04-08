import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlayerService } from './player.service';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { BlockPlayerDto } from './dto/block-player.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentPlayer } from 'src/common/decorators/player.decorator';

@ApiTags('players')
@Controller('api/players')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class PlayerController {
  constructor(private playerService: PlayerService) {}

  @Get()
  @ApiOperation({ summary: 'List all players in tenant' })
  async listPlayers(@CurrentPlayer() player: any) {
    return this.playerService.listPlayers(player.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get player by ID' })
  async getPlayer(
    @CurrentPlayer() player: any,
    @Param('id') id: string,
  ) {
    return this.playerService.getPlayer(player.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update player' })
  async updatePlayer(
    @CurrentPlayer() player: any,
    @Param('id') id: string,
    @Body() updatePlayerDto: UpdatePlayerDto,
  ) {
    return this.playerService.updatePlayer(
      player.tenantId,
      id,
      updatePlayerDto,
    );
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block a player' })
  async blockPlayer(
    @CurrentPlayer() player: any,
    @Param('id') id: string,
    @Body() blockPlayerDto: BlockPlayerDto,
  ) {
    return this.playerService.blockPlayer(player.tenantId, id, blockPlayerDto);
  }

  @Delete(':id/block/:blockedPlayerId')
  @ApiOperation({ summary: 'Unblock a player' })
  async unblockPlayer(
    @CurrentPlayer() player: any,
    @Param('id') id: string,
    @Param('blockedPlayerId') blockedPlayerId: string,
  ) {
    return this.playerService.unblockPlayer(
      player.tenantId,
      id,
      blockedPlayerId,
    );
  }
}
