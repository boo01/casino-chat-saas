import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/common/guards/permission.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { FeatureGateGuard, RequireFeature, FeatureKey } from 'src/common/guards/feature-gate.guard';
import { TenantPermission } from '@prisma/client';

@ApiTags('Analytics')
@Controller('api/tenants/:tenantId/analytics')
@UseGuards(JwtAuthGuard, PermissionGuard, FeatureGateGuard)
@ApiBearerAuth('jwt-auth')
@RequirePermission(TenantPermission.VIEW_ANALYTICS)
@RequireFeature(FeatureKey.ANALYTICS)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get analytics overview' })
  async overview(@Param('tenantId') tenantId: string) {
    return this.analyticsService.getOverview(tenantId);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get message stats by channel' })
  async messages(@Param('tenantId') tenantId: string, @Query('days') days?: number) {
    return this.analyticsService.getMessageStats(tenantId, days || 7);
  }

  @Get('players')
  @ApiOperation({ summary: 'Get player distribution stats' })
  async players(@Param('tenantId') tenantId: string) {
    return this.analyticsService.getPlayerStats(tenantId);
  }
}
