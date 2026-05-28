import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JOB_SEARCH_QUEUE } from '../queue-names';

@Injectable()
export class JobSearchQueue {
  constructor(@InjectQueue(JOB_SEARCH_QUEUE) private readonly queue: Queue) {}

  async runSearch(searchId: string): Promise<{ queued: true }> {
    await this.queue.add(
      'job-search',
      { searchId },
      { removeOnComplete: 100, removeOnFail: 50, attempts: 2 },
    );
    return { queued: true };
  }
}
