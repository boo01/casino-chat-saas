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
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('tenants')
@Controller('api/tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantService.createTenant(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  async listTenants(): Promise<TenantResponseDto[]> {
    return this.tenantService.listTenants();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async getTenant(@Param('id') id: string): Promise<TenantResponseDto> {
    return this.tenantService.getTenant(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant' })
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantService.updateTenant(id, updateTenantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tenant' })
  async deleteTenant(@Param('id') id: string): Promise<void> {
    return this.tenantService.deleteTenant(id);
  }

  @Post(':id/regenerate-api-key')
  @ApiOperation({ summary: 'Regenerate API key for tenant' })
  async regenerateApiKey(
    @Param('id') id: string,
  ): Promise<{ apiKey: string; apiSecret: string }> {
    return this.tenantService.regenerateApiKey(id);
  }
}
