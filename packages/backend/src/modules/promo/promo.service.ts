import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PromoService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: any) {
    return this.prisma.promoCard.create({
      data: { tenantId, ...data },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.promoCard.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const promo = await this.prisma.promoCard.findFirst({ where: { id, tenantId } });
    if (!promo) throw new NotFoundException('Promo not found');
    return promo;
  }

  async update(tenantId: string, id: string, data: any) {
    await this.findOne(tenantId, id);
    return this.prisma.promoCard.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.promoCard.update({ where: { id }, data: { isActive: false } });
  }
}
