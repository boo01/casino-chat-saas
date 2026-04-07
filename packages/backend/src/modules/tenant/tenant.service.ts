import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantResponseDto } from './dto/tenant-response.dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private prismaService: PrismaService) {}

  async createTenant(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    const {
      name,
      domain,
      adminEmail,
      adminPassword,
      tier,
      webhookUrl,
      branding,
    } = createTenantDto;

    // Check if domain exists
    const existingTenant = await this.prismaService.tenant.findUnique({
      where: { domain },
    });

    if (existingTenant) {
      throw new ConflictException('Domain already exists');
    }

    // Generate API credentials
    const apiKey = uuidv4();
    const apiSecret = uuidv4();
    const apiSecretHash = createHmac('sha256', 'api-secret-salt')
      .update(apiSecret)
      .digest('hex');

    // Hash admin password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create tenant and admin in transaction
    const tenant = await this.prismaService.tenant.create({
      data: {
        name,
        domain,
        apiKey,
        apiSecretHash,
        tier,
        webhookUrl,
        branding: branding || {},
        admins: {
          create: {
            email: adminEmail,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
    });

    this.logger.log(`Tenant created: ${tenant.id} (${domain})`);

    return this.mapToResponseDto(tenant);
  }

  async getTenant(id: string): Promise<TenantResponseDto> {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.mapToResponseDto(tenant);
  }

  async getTenantByDomain(domain: string): Promise<TenantResponseDto> {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { domain },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.mapToResponseDto(tenant);
  }

  async listTenants(): Promise<TenantResponseDto[]> {
    const tenants = await this.prismaService.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((tenant: any) => this.mapToResponseDto(tenant)); // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  async updateTenant(
    id: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.prismaService.tenant.update({
      where: { id },
      data: {
        ...updateTenantDto,
      },
    });

    this.logger.log(`Tenant updated: ${id}`);

    return this.mapToResponseDto(updated);
  }

  async deleteTenant(id: string): Promise<void> {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prismaService.tenant.delete({
      where: { id },
    });

    this.logger.log(`Tenant deleted: ${id}`);
  }

  async regenerateApiKey(id: string): Promise<{ apiKey: string; apiSecret: string }> {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const apiKey = uuidv4();
    const apiSecret = uuidv4();
    const apiSecretHash = createHmac('sha256', 'api-secret-salt')
      .update(apiSecret)
      .digest('hex');

    await this.prismaService.tenant.update({
      where: { id },
      data: { apiKey, apiSecretHash },
    });

    this.logger.log(`API key regenerated for tenant: ${id}`);

    return { apiKey, apiSecret };
  }

  private mapToResponseDto(tenant: any): TenantResponseDto { // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      apiKey: tenant.apiKey,
      tier: tenant.tier,
      isActive: tenant.isActive,
      webhookUrl: tenant.webhookUrl,
      allowedIps: tenant.allowedIps,
      branding: tenant.branding as Record<string, any>,
      config: tenant.config as Record<string, any>,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}
