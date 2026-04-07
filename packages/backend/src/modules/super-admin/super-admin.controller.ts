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
