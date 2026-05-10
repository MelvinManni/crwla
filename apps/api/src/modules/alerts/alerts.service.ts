import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertFrequency, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';

export type CreateAlertInput = {
  searchId?: string | null;
  keyword: string;
  sources?: string[];
  locations?: string[];
  frequency?: AlertFrequency;
};

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async listForUser(
    userId: string,
    pagination: { page?: number; pageSize?: number } = {},
  ) {
    const page = Math.max(1, pagination.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, pagination.pageSize ?? 20));
    const where = { userId };
    const [total, rows] = await Promise.all([
      this.prisma.alert.count({ where }),
      this.prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  async create(userId: string, input: CreateAlertInput) {
    await this.entitlements.assertCanCreateAlert(userId);
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
