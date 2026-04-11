import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CurrencyType } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private prismaService: PrismaService) {}

  async findAllMaster() {
    return this.prismaService.currency.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllActive() {
    return this.prismaService.currency.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCurrency(data: {
    code: string;
    name: string;
    symbol: string;
    type: CurrencyType;
    sortOrder?: number;
  }) {
    const existing = await this.prismaService.currency.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(`Currency with code "${data.code}" already exists`);
    }

    const currency = await this.prismaService.currency.create({
      data: {
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        type: data.type,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    this.logger.log(`Currency created: ${currency.code}`);
    return currency;
  }

  async updateCurrency(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      symbol: string;
      type: CurrencyType;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    const currency = await this.prismaService.currency.findUnique({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    // If code is changing, check uniqueness
    if (data.code && data.code !== currency.code) {
      const existing = await this.prismaService.currency.findUnique({
        where: { code: data.code },
      });
      if (existing) {
        throw new ConflictException(`Currency with code "${data.code}" already exists`);
      }
    }

    const updated = await this.prismaService.currency.update({
      where: { id },
      data,
    });

    this.logger.log(`Currency updated: ${updated.code}`);
    return updated;
  }

  async deleteCurrency(id: string) {
    const currency = await this.prismaService.currency.findUnique({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    // Soft delete
    await this.prismaService.currency.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Currency deactivated: ${currency.code}`);
  }

  async findTenantCurrencies(tenantId: string) {
    return this.prismaService.tenantCurrency.findMany({
      where: { tenantId },
      include: {
        currency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
            type: true,
            isActive: true,
            sortOrder: true,
          },
        },
      },
      orderBy: { currency: { sortOrder: 'asc' } },
    });
  }

  async enableCurrencyForTenant(tenantId: string, currencyId: string) {
    const currency = await this.prismaService.currency.findUnique({
      where: { id: currencyId },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    // Check if already enabled
    const existing = await this.prismaService.tenantCurrency.findUnique({
      where: { tenantId_currencyId: { tenantId, currencyId } },
    });

    if (existing) {
      throw new ConflictException('Currency already enabled for this tenant');
    }

    const tenantCurrency = await this.prismaService.tenantCurrency.create({
      data: { tenantId, currencyId },
      include: {
        currency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
            type: true,
            isActive: true,
            sortOrder: true,
          },
        },
      },
    });

    this.logger.log(`Currency ${currency.code} enabled for tenant ${tenantId}`);
    return tenantCurrency;
  }

  async disableCurrencyForTenant(tenantId: string, tenantCurrencyId: string) {
    const tenantCurrency = await this.prismaService.tenantCurrency.findFirst({
      where: { id: tenantCurrencyId, tenantId },
    });

    if (!tenantCurrency) {
      throw new NotFoundException('Tenant currency not found');
    }

    await this.prismaService.tenantCurrency.delete({
      where: { id: tenantCurrencyId },
    });

    this.logger.log(`Tenant currency ${tenantCurrencyId} removed for tenant ${tenantId}`);
  }

  async setDefaultCurrency(tenantId: string, tenantCurrencyId: string) {
    const tenantCurrency = await this.prismaService.tenantCurrency.findFirst({
      where: { id: tenantCurrencyId, tenantId },
    });

    if (!tenantCurrency) {
      throw new NotFoundException('Tenant currency not found');
    }

    // Unset all defaults for this tenant, then set the new one
    await this.prismaService.$transaction([
      this.prismaService.tenantCurrency.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prismaService.tenantCurrency.update({
        where: { id: tenantCurrencyId },
        data: { isDefault: true },
      }),
    ]);

    this.logger.log(`Default currency set to ${tenantCurrencyId} for tenant ${tenantId}`);

    return this.prismaService.tenantCurrency.findUnique({
      where: { id: tenantCurrencyId },
      include: {
        currency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
            type: true,
            isActive: true,
            sortOrder: true,
          },
        },
      },
    });
  }
}
