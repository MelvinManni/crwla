import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  ActivityType,
} from './activity.types';

type LogInput = {
  userId: string;
  type: ActivityType;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget log. Never throws — activity is observational, so a
   * write failure (DB blip, schema drift) should not break the user
   * action that triggered it.
   */
  log(input: LogInput): void {
    void this.prisma.userActivity
      .create({
        data: {
          userId: input.userId,
          type: input.type,
          targetId: input.targetId ?? null,
          metadata: input.metadata ?? Prisma.JsonNull,
        },
      })
      .catch((e) => {
        this.logger.warn(
          `activity.log(${input.type}) failed for user ${input.userId}: ${(e as Error).message}`,
        );
      });
  }

  async statsForUser(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [total, byType, recent, daily] = await Promise.all([
      this.prisma.userActivity.count({ where: { userId } }),
      this.prisma.userActivity.groupBy({
        by: ['type'],
        where: { userId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      // Daily counts as raw SQL — Prisma's groupBy doesn't support a
      // date_trunc on the createdAt column directly.
      this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*)::bigint AS count
        FROM "user_activity"
        WHERE "user_id" = ${userId}
          AND "created_at" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `),
    ]);

    // Fill in the zero-days so the chart is gap-free across `days` buckets.
    const dailyMap = new Map<string, number>();
    for (const row of daily) {
      const key = row.day.toISOString().slice(0, 10);
      dailyMap.set(key, Number(row.count));
    }
    const dailySeries: Array<{ day: string; count: number }> = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailySeries.push({ day: key, count: dailyMap.get(key) ?? 0 });
    }

    return {
      total,
      windowDays: days,
      byType: byType
        .map((r) => ({
          type: r.type as ActivityType,
          label: ACTIVITY_LABELS[r.type as ActivityType] ?? r.type,
          count: r._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      daily: dailySeries,
      recent: recent.map((r) => ({
        id: r.id,
        type: r.type as ActivityType,
        label: ACTIVITY_LABELS[r.type as ActivityType] ?? r.type,
        targetId: r.targetId,
        metadata: r.metadata as unknown,
        at: r.createdAt.getTime(),
      })),
      types: ACTIVITY_TYPES,
    };
  }
}
