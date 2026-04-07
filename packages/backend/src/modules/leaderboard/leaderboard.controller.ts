import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FeatureGateGuard, RequireFeature, FeatureKey } from 'src/common/guards/feature-gate.guard';
import { LeaderboardPeriod } from '@prisma/client';

@ApiTags('Leaderboard')
@Controller('api/tenants/:tenantId/leaderboard')
@UseGuards(JwtAuthGuard, FeatureGateGuard)
@ApiBearerAuth('jwt-auth')
@RequireFeature(FeatureKey.LEADERBOARD)
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get leaderboard' })
  async getLeaderboard(
    @Param('tenantId') tenantId: string,
    @Query('period') period?: string,
    @Query('limit') limit?: number,
  ) {
    const lbPeriod = (period?.toUpperCase() as LeaderboardPeriod) || LeaderboardPeriod.WEEKLY;
    return this.leaderboardService.getLeaderboard(tenantId, lbPeriod, limit || 20);
  }
}
