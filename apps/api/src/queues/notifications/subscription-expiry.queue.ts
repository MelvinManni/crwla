import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SUBSCRIPTION_EXPIRY_QUEUE } from '../queue-names';

const REPEAT_KEY = 'repeat:check-expiry';
const TICK_MS = 24 * 60 * 60 * 1000; // daily

/**
 * BullMQ wrapper for the daily subscription-expiry sweep. Single key — the
 * worker walks every near-expiry subscription on each tick, so no per-row
 * schedules are needed. Mirrors ScheduledPlanChangesQueue.
 */
@Injectable()
export class SubscriptionExpiryQueue {
  private readonly logger = new Logger(SubscriptionExpiryQueue.name);

  constructor(@InjectQueue(SUBSCRIPTION_EXPIRY_QUEUE) private readonly queue: Queue) {}

  /** Idempotent — clears prior repeatable then arms a fresh one. */
  async scheduleRepeatable(): Promise<void> {
    await this.unscheduleRepeatable();
    await this.queue.add(
      'check-expiry',
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
        if (r.id === REPEAT_KEY || r.name === 'check-expiry') {
          await this.queue.removeRepeatableByKey(r.key);
        }
      }
    } catch (e) {
      this.logger.warn(`unschedule failed: ${(e as Error).message}`);
    }
  }
}
