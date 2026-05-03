import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CronPreset } from '@prisma/client';
import { SCRAPE_QUEUE } from '../queue-names';

const CRON_EXPR: Record<CronPreset, string | null> = {
  HOURLY: '0 * * * *',
  DAILY: '0 9 * * *',
  WEEKLY: '0 8 * * 1',
  MANUAL: null,
};

const REPEAT_KEY = (id: string) => `repeat:${id}`;

@Injectable()
export class ScrapeQueue {
  private readonly logger = new Logger(ScrapeQueue.name);

  constructor(@InjectQueue(SCRAPE_QUEUE) private readonly queue: Queue) {}

  async scheduleRepeatable(searchId: string, preset: CronPreset): Promise<void> {
    await this.unschedule(searchId);
    const expr = CRON_EXPR[preset];
    if (!expr) return; // MANUAL — nothing to schedule
    await this.queue.add(
      'scrape',
      { searchId },
      {
        jobId: REPEAT_KEY(searchId),
        repeat: { pattern: expr },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );
  }

  async unschedule(searchId: string): Promise<void> {
    try {
      const repeatables = await this.queue.getRepeatableJobs();
      for (const r of repeatables) {
        if (r.id === REPEAT_KEY(searchId) || r.name === REPEAT_KEY(searchId)) {
          await this.queue.removeRepeatableByKey(r.key);
        }
      }
    } catch (e) {
      this.logger.warn(`unschedule(${searchId}) failed: ${(e as Error).message}`);
    }
  }

  async runNow(searchId: string): Promise<{ queued: true }> {
    await this.queue.add(
      'scrape-now',
      { searchId },
      { removeOnComplete: 20, removeOnFail: 20 },
    );
    return { queued: true };
  }
}
