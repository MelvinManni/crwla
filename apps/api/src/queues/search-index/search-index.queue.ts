import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SEARCH_INDEX_QUEUE } from '../queue-names';

const CHUNK = 500;

@Injectable()
export class SearchIndexQueue {
  constructor(@InjectQueue(SEARCH_INDEX_QUEUE) private readonly queue: Queue) {}

  async indexOne(resultId: string) {
    return this.queue.add(
      'index-result',
      { resultId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 },
      },
    );
  }

  async bulkIndex(rows: Array<{ id: string }>) {
    if (rows.length === 0) return;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      await this.queue.add(
        'bulk-index-results',
        { ids: chunk.map((r) => r.id) },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600 },
        },
      );
    }
  }
}
