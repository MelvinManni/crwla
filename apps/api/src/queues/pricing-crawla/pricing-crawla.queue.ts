import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PRICING_CRAWLA_QUEUE } from '../queue-names';

@Injectable()
export class PricingCrawlaQueue {
  private readonly logger = new Logger(PricingCrawlaQueue.name);

  constructor(@InjectQueue(PRICING_CRAWLA_QUEUE) private readonly queue: Queue) {}

  async runSearch(searchId: string): Promise<{ queued: true }> {
    await this.queue.add(
      'pricing-search',
      { searchId },
      { removeOnComplete: 100, removeOnFail: 50, attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
    );
    return { queued: true };
  }
}
