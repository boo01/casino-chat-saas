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
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { CreateTenantDto } from 'src/modules/tenant/dto/create-tenant.dto';
import { CurrentUser } from 'src/common/decorators/current-player.decorator';

@ApiTags('Super Admin')
@Controller('api/super-admin')
export class SuperAdminController {
  constructor(private superAdminService: SuperAdminService) {}

  @Post('auth/login')
  @ApiOperation({ summary: 'Super admin login' })
  async login(@Body() dto: SuperAdminLoginDto) {
    return this.superAdminService.login(dto);
  }

  @Get('dashboard')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Platform dashboard stats' })
  async dashboard() {
    return this.superAdminService.getDashboardStats();
  }

  @Get('tenants')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'List all tenants with counts' })
  async listTenants() {
    return this.superAdminService.getTenantsList();
  }

  @Get('tenants/:id/stats')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Get tenant stats' })
  async tenantStats(@Param('id') id: string) {
    return this.superAdminService.getTenantStats(id);
  }

  @Post('tenants')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Create a new tenant' })
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.superAdminService.createTenant(dto);
  }

  @Patch('tenants/:id')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Update a tenant' })
  async updateTenant(
    @Param('id') id: string,
    @Body() dto: { name?: string; domain?: string; tier?: any; webhookUrl?: string; isActive?: boolean },
  ) {
    return this.superAdminService.updateTenant(id, dto);
  }

  @Patch('tenants/:id/suspend')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Suspend a tenant' })
  async suspendTenant(@Param('id') id: string) {
    return this.superAdminService.suspendTenant(id);
  }

  @Patch('tenants/:id/activate')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Activate a tenant' })
  async activateTenant(@Param('id') id: string) {
    return this.superAdminService.activateTenant(id);
  }

  @Delete('tenants/:id')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Delete a tenant' })
  async deleteTenant(@Param('id') id: string) {
    return this.superAdminService.deleteTenant(id);
  }

  @Get('tenants/:id/admins')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'List tenant admins' })
  async getTenantAdmins(@Param('id') id: string) {
    return this.superAdminService.getTenantAdmins(id);
  }

  @Post('tenants/:id/impersonate')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Impersonate tenant owner' })
  async impersonate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.superAdminService.impersonateTenant(id, user.id);
  }

  @Post('admins')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Create super admin' })
  async create(@Body() dto: CreateSuperAdminDto) {
    return this.superAdminService.create(dto);
  }

  @Get('admins')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'List super admins' })
  async findAll() {
    return this.superAdminService.findAll();
  }

  @Patch('admins/:id')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Update super admin' })
  async update(@Param('id') id: string, @Body() dto: UpdateSuperAdminDto) {
    return this.superAdminService.update(id, dto);
  }

  @Delete('admins/:id')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Deactivate super admin' })
  async delete(@Param('id') id: string) {
    return this.superAdminService.delete(id);
  }
}
