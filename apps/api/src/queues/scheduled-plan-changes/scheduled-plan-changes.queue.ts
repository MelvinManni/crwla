import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SCHEDULED_PLAN_CHANGES_QUEUE } from '../queue-names';

const REPEAT_KEY = 'repeat:apply-due';
const TICK_MS = 15 * 60 * 1000;

/**
 * BullMQ wrapper for the "apply due plan changes" repeatable. Single key —
 * the worker walks the whole `ScheduledPlanChange` table on each tick, so
 * we don't need per-row schedules.
 */
@Injectable()
export class ScheduledPlanChangesQueue {
  private readonly logger = new Logger(ScheduledPlanChangesQueue.name);

  constructor(@InjectQueue(SCHEDULED_PLAN_CHANGES_QUEUE) private readonly queue: Queue) {}

  /** Idempotent — clears prior repeatable then arms a fresh one. */
  async scheduleRepeatable(): Promise<void> {
    await this.unscheduleRepeatable();
    await this.queue.add(
      'apply-due',
      {},
      {
        jobId: REPEAT_KEY,
        repeat: { every: TICK_MS },
        removeOnComplete: 10,
        removeOnFail: 10,
      },
    );
    this.logger.log(`armed every ${TICK_MS / 1000}s`);
  }

  async unscheduleRepeatable(): Promise<void> {
    try {
      const repeatables = await this.queue.getRepeatableJobs();
      for (const r of repeatables) {
        if (r.id === REPEAT_KEY || r.name === 'apply-due') {
          await this.queue.removeRepeatableByKey(r.key);
        }
      }
    } catch (e) {
      this.logger.warn(`unschedule failed: ${(e as Error).message}`);
    }
  }
}
