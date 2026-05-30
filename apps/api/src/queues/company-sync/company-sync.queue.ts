import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { COMPANY_SYNC_QUEUE } from '../queue-names';

const REPEAT_KEY = 'repeat:company-sync';
// Daily at ~03:00 (server time). Override with DISCOVERY_SYNC_CRON.
const DEFAULT_CRON = '0 3 * * *';

/**
 * BullMQ wrapper for the daily "pull verified companies from the discovery
 * service" repeatable. Single key — the processor pages through the discovery
 * `/companies` endpoint and upserts into TrackedCompany on each tick.
 */
@Injectable()
export class CompanySyncQueue {
  private readonly logger = new Logger(CompanySyncQueue.name);
  private readonly cron: string;

  constructor(
    @InjectQueue(COMPANY_SYNC_QUEUE) private readonly queue: Queue,
    config: ConfigService,
  ) {
    this.cron = config.get<string>('DISCOVERY_SYNC_CRON') || DEFAULT_CRON;
  }

  /** Idempotent — clears the prior repeatable then arms a fresh one. */
  async scheduleRepeatable(): Promise<void> {
    await this.unscheduleRepeatable();
    await this.queue.add(
      'sync',
      {},
      {
        jobId: REPEAT_KEY,
        repeat: { pattern: this.cron },
        removeOnComplete: 20,
        removeOnFail: 20,
      },
    );
    this.logger.log(`armed company-sync at cron "${this.cron}"`);
  }

  async unscheduleRepeatable(): Promise<void> {
    try {
      const repeatables = await this.queue.getRepeatableJobs();
      for (const r of repeatables) {
        if (r.id === REPEAT_KEY || r.name === 'sync') {
          await this.queue.removeRepeatableByKey(r.key);
        }
      }
    } catch (e) {
      this.logger.warn(`unschedule failed: ${(e as Error).message}`);
    }
  }

  /** Enqueue a one-off run immediately (e.g. for an admin trigger or self-check). */
  async runNow(): Promise<void> {
    await this.queue.add('sync', {}, { removeOnComplete: 20, removeOnFail: 20 });
  }
}
