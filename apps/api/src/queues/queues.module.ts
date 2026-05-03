import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScrapeQueue } from './scrape/scrape.queue';
import { ScrapeProcessor } from './scrape/scrape.processor';
import { SearchIndexQueue } from './search-index/search-index.queue';
import { SearchIndexProcessor } from './search-index/search-index.processor';
import { ScraperModule } from '../modules/scraper/scraper.module';
import { FilterModule } from '../modules/filter/filter.module';
import { SCRAPE_QUEUE, SEARCH_INDEX_QUEUE } from './queue-names';

export { SCRAPE_QUEUE, SEARCH_INDEX_QUEUE };

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
    BullModule.registerQueue({ name: SCRAPE_QUEUE }, { name: SEARCH_INDEX_QUEUE }),
    ScraperModule,
    FilterModule,
  ],
  providers: [ScrapeQueue, ScrapeProcessor, SearchIndexQueue, SearchIndexProcessor],
  exports: [ScrapeQueue, SearchIndexQueue],
})
export class QueuesModule {}
