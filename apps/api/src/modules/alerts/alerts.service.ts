import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertFrequency, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { ActivityService } from '../activity/activity.service';

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
    private readonly activity: ActivityService,
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
    const created = await this.prisma.alert.create({
      data: {
        userId,
        searchId: input.searchId ?? null,
        keyword: input.keyword,
        sources: input.sources ?? [],
        locations: input.locations ?? [],
        frequency: input.frequency ?? AlertFrequency.DAILY,
      },
    });
    this.activity.log({
      userId,
      type: 'alert.created',
      targetId: created.id,
      metadata: { keyword: created.keyword, frequency: created.frequency },
    });
    return created;
  }

  async patch(userId: string, id: string, data: Prisma.AlertUpdateInput) {
    const owned = await this.prisma.alert.findFirst({ where: { id, userId } });
    if (!owned) throw new NotFoundException('not found');
    const updated = await this.prisma.alert.update({ where: { id }, data });
    this.activity.log({ userId, type: 'alert.updated', targetId: id });
    return updated;
  }

  async remove(userId: string, id: string) {
    const owned = await this.prisma.alert.findFirst({ where: { id, userId } });
    if (!owned) throw new NotFoundException('not found');
    await this.prisma.alert.delete({ where: { id } });
    this.activity.log({ userId, type: 'alert.deleted', targetId: id });
    return { ok: true };
  }
}
