import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TriviaService } from './trivia.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/common/guards/permission.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { FeatureGateGuard, RequireFeature, FeatureKey } from 'src/common/guards/feature-gate.guard';
import { TenantPermission } from '@prisma/client';

@ApiTags('Trivia')
@Controller('api/tenants/:tenantId/trivia')
@UseGuards(JwtAuthGuard, PermissionGuard, FeatureGateGuard)
@ApiBearerAuth('jwt-auth')
@RequireFeature(FeatureKey.TRIVIA)
export class TriviaController {
  constructor(private triviaService: TriviaService) {}

  @Post()
  @RequirePermission(TenantPermission.MANAGE_TRIVIA)
  @ApiOperation({ summary: 'Create trivia question' })
  async create(@Param('tenantId') tenantId: string, @Body() body: any) {
    return this.triviaService.create(tenantId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List trivia questions' })
  async findAll(@Param('tenantId') tenantId: string) {
    return this.triviaService.findAll(tenantId);
  }

  @Patch(':id')
  @RequirePermission(TenantPermission.MANAGE_TRIVIA)
  @ApiOperation({ summary: 'Update trivia question' })
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.triviaService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermission(TenantPermission.MANAGE_TRIVIA)
  @ApiOperation({ summary: 'Deactivate trivia question' })
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.triviaService.remove(tenantId, id);
  }
}
