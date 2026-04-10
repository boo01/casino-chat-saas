import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FeatureGateGuard, RequireFeature, FeatureKey } from 'src/common/guards/feature-gate.guard';
import { PermissionGuard } from 'src/common/guards/permission.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { LeaderboardPeriod, TenantPermission } from '@prisma/client';

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

  @Post('recalculate')
  @UseGuards(PermissionGuard)
  @RequirePermission(TenantPermission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Recalculate leaderboard from player wager data' })
  async recalculate(
    @Param('tenantId') tenantId: string,
    @Query('period') period?: string,
  ) {
    const lbPeriod = (period?.toUpperCase() as LeaderboardPeriod) || LeaderboardPeriod.WEEKLY;
    return this.leaderboardService.recalculate(tenantId, lbPeriod);
  }
}
