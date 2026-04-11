import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { SuperAdminGuard } from 'src/modules/super-admin/guards/super-admin.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { EnableCurrencyDto } from './dto/enable-currency.dto';

// ===== Super Admin Endpoints =====

@ApiTags('Super Admin - Currencies')
@Controller('api/super-admin/currencies')
@UseGuards(SuperAdminGuard)
@ApiBearerAuth('jwt-auth')
export class CurrencyAdminController {
  constructor(private currencyService: CurrencyService) {}

  @Get()
  @ApiOperation({ summary: 'List all master currencies' })
  async findAll() {
    return this.currencyService.findAllMaster();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new currency' })
  async create(@Body() dto: CreateCurrencyDto) {
    return this.currencyService.createCurrency(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a currency' })
  async update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    return this.currencyService.updateCurrency(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a currency (soft delete)' })
  async delete(@Param('id') id: string) {
    return this.currencyService.deleteCurrency(id);
  }
}

// ===== Public Currency List (any authenticated user) =====

@ApiTags('Currencies')
@Controller('api/currencies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class CurrencyPublicController {
  constructor(private currencyService: CurrencyService) {}

  @Get()
  @ApiOperation({ summary: 'List all active currencies (for dropdowns)' })
  async findAllActive() {
    return this.currencyService.findAllActive();
  }
}

// ===== Tenant Endpoints =====

@ApiTags('Tenant - Currencies')
@Controller('api/tenants/:tenantId/currencies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class TenantCurrencyController {
  constructor(private currencyService: CurrencyService) {}

  @Get()
  @ApiOperation({ summary: 'List currencies enabled for a tenant' })
  async findTenantCurrencies(@Param('tenantId') tenantId: string) {
    return this.currencyService.findTenantCurrencies(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Enable a currency for a tenant' })
  async enableCurrency(
    @Param('tenantId') tenantId: string,
    @Body() dto: EnableCurrencyDto,
  ) {
    return this.currencyService.enableCurrencyForTenant(tenantId, dto.currencyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disable a currency for a tenant' })
  async disableCurrency(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.currencyService.disableCurrencyForTenant(tenantId, id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set a currency as default for a tenant' })
  async setDefault(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.currencyService.setDefaultCurrency(tenantId, id);
  }
}
