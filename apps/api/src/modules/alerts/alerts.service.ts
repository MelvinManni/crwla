import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertFrequency, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

export type CreateAlertInput = {
  searchId?: string | null;
  keyword: string;
  sources?: string[];
  locations?: string[];
  frequency?: AlertFrequency;
};

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const rows = await this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows;
  }

  async create(userId: string, input: CreateAlertInput) {
    return this.prisma.alert.create({
      data: {
        userId,
        searchId: input.searchId ?? null,
        keyword: input.keyword,
        sources: input.sources ?? [],
        locations: input.locations ?? [],
        frequency: input.frequency ?? AlertFrequency.DAILY,
      },
    });
  }

  async patch(userId: string, id: string, data: Prisma.AlertUpdateInput) {
    const owned = await this.prisma.alert.findFirst({ where: { id, userId } });
    if (!owned) throw new NotFoundException('not found');
    return this.prisma.alert.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const owned = await this.prisma.alert.findFirst({ where: { id, userId } });
    if (!owned) throw new NotFoundException('not found');
    await this.prisma.alert.delete({ where: { id } });
    return { ok: true };
  }
}
