import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PromoService } from './promo.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/common/guards/permission.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { FeatureGateGuard, RequireFeature, FeatureKey } from 'src/common/guards/feature-gate.guard';
import { TenantPermission } from '@prisma/client';

@ApiTags('Promos')
@Controller('api/tenants/:tenantId/promos')
@UseGuards(JwtAuthGuard, PermissionGuard, FeatureGateGuard)
@ApiBearerAuth('jwt-auth')
@RequireFeature(FeatureKey.PROMOS)
export class PromoController {
  constructor(private promoService: PromoService) {}

  @Post()
  @RequirePermission(TenantPermission.MANAGE_PROMO)
  @ApiOperation({ summary: 'Create promo card' })
  async create(@Param('tenantId') tenantId: string, @Body() body: any) {
    return this.promoService.create(tenantId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List promo cards' })
  async findAll(@Param('tenantId') tenantId: string) {
    return this.promoService.findAll(tenantId);
  }

  @Patch(':id')
  @RequirePermission(TenantPermission.MANAGE_PROMO)
  @ApiOperation({ summary: 'Update promo card' })
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.promoService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermission(TenantPermission.MANAGE_PROMO)
  @ApiOperation({ summary: 'Deactivate promo card' })
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.promoService.remove(tenantId, id);
  }
}
