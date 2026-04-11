import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TenantService } from 'src/modules/tenant/tenant.service';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { CreateTenantDto } from 'src/modules/tenant/dto/create-tenant.dto';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private tenantService: TenantService,
  ) {}

  async login(dto: SuperAdminLoginDto) {
    const admin = await this.prismaService.superAdmin.findUnique({
      where: { email: dto.email },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const expiresIn = this.configService.get<string>('jwt.expiresIn', '24h');

    const token = this.jwtService.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isSuperAdmin: true,
      },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn,
      },
    );

    return {
      accessToken: token,
      tokenType: 'Bearer',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async create(dto: CreateSuperAdminDto) {
    const existing = await this.prismaService.superAdmin.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const admin = await this.prismaService.superAdmin.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
      },
    });

    this.logger.log(`Super admin created: ${admin.email}`);

    return this.sanitize(admin);
  }

  async findAll() {
    const admins = await this.prismaService.superAdmin.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return admins.map((a: any) => this.sanitize(a));
  }

  async findById(id: string) {
    const admin = await this.prismaService.superAdmin.findUnique({
      where: { id },
    });
    if (!admin) throw new NotFoundException('Super admin not found');
    return this.sanitize(admin);
  }

  async update(id: string, dto: UpdateSuperAdminDto) {
    const admin = await this.prismaService.superAdmin.findUnique({
      where: { id },
    });
    if (!admin) throw new NotFoundException('Super admin not found');

    const updated = await this.prismaService.superAdmin.update({
      where: { id },
      data: dto,
    });

    return this.sanitize(updated);
  }

  async delete(id: string) {
    const admin = await this.prismaService.superAdmin.findUnique({
      where: { id },
    });
    if (!admin) throw new NotFoundException('Super admin not found');

    await this.prismaService.superAdmin.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Super admin deactivated: ${admin.email}`);
  }

  async getTenantsList() {
    return this.prismaService.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            players: true,
            channels: true,
            messages: true,
            admins: true,
          },
        },
      },
    });
  }

  async getTenantStats(tenantId: string) {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const [playerCount, channelCount, messageCount, adminCount] = await Promise.all([
      this.prismaService.player.count({ where: { tenantId } }),
      this.prismaService.channel.count({ where: { tenantId } }),
      this.prismaService.message.count({ where: { tenantId } }),
      this.prismaService.tenantAdmin.count({ where: { tenantId } }),
    ]);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        tier: tenant.tier,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
      },
      stats: {
        players: playerCount,
        channels: channelCount,
        messages: messageCount,
        admins: adminCount,
      },
    };
  }

  async getDashboardStats() {
    const [tenantCount, totalPlayers, totalMessages, activeTenants] = await Promise.all([
      this.prismaService.tenant.count(),
      this.prismaService.player.count(),
      this.prismaService.message.count(),
      this.prismaService.tenant.count({ where: { isActive: true } }),
    ]);

    return {
      tenants: tenantCount,
      activeTenants,
      totalPlayers,
      totalMessages,
    };
  }

  async createTenant(data: CreateTenantDto) {
    const tenant = await this.tenantService.createTenant(data);
    // Assign USD as default currency if it exists
    const usd = await this.prismaService.currency.findUnique({ where: { code: 'USD' } });
    if (usd) {
      await this.prismaService.tenantCurrency.create({
        data: { tenantId: tenant.id, currencyId: usd.id, isDefault: true },
      });
    }
    return tenant;
  }

  async updateTenant(id: string, data: { name?: string; domain?: string; tier?: any; webhookUrl?: string; isActive?: boolean }) {
    return this.tenantService.updateTenant(id, data);
  }

  async suspendTenant(id: string) {
    const tenant = await this.prismaService.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prismaService.tenant.update({ where: { id }, data: { isActive: false } });
  }

  async activateTenant(id: string) {
    const tenant = await this.prismaService.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prismaService.tenant.update({ where: { id }, data: { isActive: true } });
  }

  async deleteTenant(id: string) {
    return this.tenantService.deleteTenant(id);
  }

  async getTenantAdmins(tenantId: string) {
    const tenant = await this.prismaService.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prismaService.tenantAdmin.findMany({
      where: { tenantId },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    });
  }

  async impersonateTenant(tenantId: string, superAdminId: string) {
    const tenant = await this.prismaService.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const owner = await this.prismaService.tenantAdmin.findFirst({
      where: { tenantId, role: 'OWNER', isActive: true },
    });
    if (!owner) throw new NotFoundException('No active owner found for this tenant');

    const token = this.jwtService.sign(
      {
        id: owner.id,
        tenantId: owner.tenantId,
        email: owner.email,
        role: owner.role,
        isSuperAdmin: false,
        impersonatedBy: superAdminId,
      },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: '4h',
      },
    );

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 14400,
      admin: {
        id: owner.id,
        email: owner.email,
        tenantId: owner.tenantId,
        role: owner.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        tier: tenant.tier,
      },
    };
  }

  private sanitize(admin: any) {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }
}
