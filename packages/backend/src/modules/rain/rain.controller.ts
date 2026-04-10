import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RainService } from './rain.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/common/guards/permission.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { FeatureGateGuard, RequireFeature, FeatureKey } from 'src/common/guards/feature-gate.guard';
import { CurrentUser } from 'src/common/decorators/current-player.decorator';
import { TenantPermission } from '@prisma/client';

@ApiTags('Rain')
@Controller('api/tenants/:tenantId/rain')
@UseGuards(JwtAuthGuard, PermissionGuard, FeatureGateGuard)
@ApiBearerAuth('jwt-auth')
@RequireFeature(FeatureKey.RAIN_EVENTS)
export class RainController {
  constructor(private rainService: RainService) {}

  @Post()
  @RequirePermission(TenantPermission.MANAGE_RAIN)
  @ApiOperation({ summary: 'Trigger rain event' })
  async trigger(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.rainService.triggerRain(tenantId, {
      ...body,
      initiatedById: user.id,
      perPlayerAmount: body.perPlayerAmount || 0,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List rain events' })
  async findAll(@Param('tenantId') tenantId: string) {
    return this.rainService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rain event details with claims' })
  async findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.rainService.findOne(tenantId, id);
  }
}
