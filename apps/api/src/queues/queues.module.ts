import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScrapeQueue } from './scrape/scrape.queue';
import { ScrapeProcessor } from './scrape/scrape.processor';
import { SearchIndexQueue } from './search-index/search-index.queue';
import { SearchIndexProcessor } from './search-index/search-index.processor';
import { ScraperModule } from '../modules/scraper/scraper.module';
import { FilterModule } from '../modules/filter/filter.module';
import {
  JOB_SEARCH_QUEUE,
  PRICING_CRAWLA_QUEUE,
  SCHEDULED_PLAN_CHANGES_QUEUE,
  SCRAPE_QUEUE,
  SEARCH_INDEX_QUEUE,
} from './queue-names';

export {
  SCRAPE_QUEUE,
  SEARCH_INDEX_QUEUE,
  SCHEDULED_PLAN_CHANGES_QUEUE,
  PRICING_CRAWLA_QUEUE,
  JOB_SEARCH_QUEUE,
};

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const u = new URL(url);
        return {
          connection: {
            host: u.hostname,
            port: Number(u.port || 6379),
            username: u.username || undefined,
            password: u.password || undefined,
            tls: u.protocol === 'rediss:' ? {} : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    // The `scheduled-plan-changes` queue is registered here too so any
    // module can `@InjectQueue(SCHEDULED_PLAN_CHANGES_QUEUE)`. The wrapper
    // service + processor live in BillingModule (not here) because the
    // processor depends on BillingService — keeping the dep edge there
    // avoids a Queues↔Billing import cycle.
    BullModule.registerQueue(
      { name: SCRAPE_QUEUE },
      { name: SEARCH_INDEX_QUEUE },
      { name: SCHEDULED_PLAN_CHANGES_QUEUE },
      { name: PRICING_CRAWLA_QUEUE },
      { name: JOB_SEARCH_QUEUE },
    ),
    ScraperModule,
    FilterModule,
  ],
  providers: [ScrapeQueue, ScrapeProcessor, SearchIndexQueue, SearchIndexProcessor],
  exports: [ScrapeQueue, SearchIndexQueue, BullModule],
})
export class QueuesModule {}
