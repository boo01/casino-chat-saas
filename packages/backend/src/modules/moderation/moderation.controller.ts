import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { BannedWordDto } from './dto/banned-word.dto';
import { ModeratePlayerDto } from './dto/moderate-player.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentPlayer } from 'src/common/decorators/player.decorator';

@ApiTags('moderation')
@Controller('moderation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  // Banned Words
  @Post('banned-words')
  @ApiOperation({ summary: 'Add a banned word' })
  async addBannedWord(
    @CurrentPlayer() player: any,
    @Body() bannedWordDto: BannedWordDto,
  ) {
    return this.moderationService.addBannedWord(
      player.tenantId,
      bannedWordDto,
    );
  }

  @Get('banned-words')
  @ApiOperation({ summary: 'List banned words' })
  async listBannedWords(@CurrentPlayer() player: any) {
    return this.moderationService.listBannedWords(player.tenantId);
  }

  @Delete('banned-words/:id')
  @ApiOperation({ summary: 'Remove a banned word' })
  async removeBannedWord(
    @CurrentPlayer() player: any,
    @Param('id') id: string,
  ) {
    return this.moderationService.removeBannedWord(player.tenantId, id);
  }

  // Moderation Actions
  @Post('actions/:playerId')
  @ApiOperation({ summary: 'Apply moderation action to player' })
  async moderatePlayer(
    @CurrentPlayer() player: any,
    @Param('playerId') playerId: string,
    @Body() moderatePlayerDto: ModeratePlayerDto,
  ) {
    return this.moderationService.moderatePlayer(
      player.tenantId,
      player.id,
      playerId,
      moderatePlayerDto,
    );
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get moderation logs' })
  async getModerationLogs(
    @CurrentPlayer() player: any,
    @Query('playerId') playerId?: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.moderationService.getModerationLogs(
      player.tenantId,
      playerId,
      limit,
    );
  }
}
