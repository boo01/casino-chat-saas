import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class TriviaService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: any) {
    return this.prisma.triviaQuestion.create({
      data: { tenantId, ...data },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.triviaQuestion.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const trivia = await this.prisma.triviaQuestion.findFirst({ where: { id, tenantId } });
    if (!trivia) throw new NotFoundException('Trivia question not found');
    return trivia;
  }

  async update(tenantId: string, id: string, data: any) {
    await this.findOne(tenantId, id);
    return this.prisma.triviaQuestion.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.triviaQuestion.update({ where: { id }, data: { isActive: false } });
  }
}
