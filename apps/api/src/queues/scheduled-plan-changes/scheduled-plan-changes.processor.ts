import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Plan, ScheduledPlanChange } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { BillingService } from '../../modules/billing/billing.service';
import { SCHEDULED_PLAN_CHANGES_QUEUE } from '../queue-names';

/**
 * Walks pending `ScheduledPlanChange` rows whose `scheduledFor <= now()`
 * and applies them. Concurrency 1 to avoid double-applies.
 *
 * Today only FREE-tier downgrades are fully implemented — paid-to-paid
 * downgrades are recorded but the worker logs a TODO and leaves the row
 * PENDING (Polar already prorates between paid plans on the next renewal,
 * so the user-experience cost of this gap is small for now).
 */
@Processor(SCHEDULED_PLAN_CHANGES_QUEUE, { concurrency: 1 })
export class ScheduledPlanChangesProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledPlanChangesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {
    super();
  }

  async process(_job: Job): Promise<{ processed: number; applied: number }> {
    const due = await this.prisma.scheduledPlanChange.findMany({
      where: { status: 'PENDING', scheduledFor: { lte: new Date() } },
      include: { targetPlan: true },
      orderBy: { scheduledFor: 'asc' },
      take: 100, // bound the per-tick batch
    });
    if (due.length === 0) return { processed: 0, applied: 0 };

    let applied = 0;
    for (const row of due) {
      try {
        await this.applyOne(row);
        applied++;
      } catch (e) {
        this.logger.error(
          `failed to apply scheduled change ${row.id}: ${(e as Error).message}`,
        );
        // Leave PENDING — next tick will retry.
      }
    }
    return { processed: due.length, applied };
  }

  private async applyOne(row: ScheduledPlanChange & { targetPlan: Plan }) {
    if (row.targetPlan.tier === 'FREE') {
      await this.billing.applyFreeTier(row.userId);
    } else {
      // TODO: paid-to-paid downgrade. Requires Polar subscription update
      // (different product id). Skip this row for now and log; it stays
      // PENDING so once the path is implemented, the change still fires.
      this.logger.warn(
        `paid-to-paid downgrade to ${row.targetPlan.tier} not implemented; skipping row ${row.id}`,
      );
      return;
    }
    await this.prisma.scheduledPlanChange.update({
      where: { id: row.id },
      data: { status: 'APPLIED', appliedAt: new Date() },
    });
    this.logger.log(`applied scheduled change ${row.id} → ${row.targetPlan.tier}`);
  }
}
