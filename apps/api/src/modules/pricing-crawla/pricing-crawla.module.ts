import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PricingCrawlaController } from './pricing-crawla.controller';
import { PricingCrawlaService } from './pricing-crawla.service';
import { PricingIntentService } from './ai/intent.service';
import { CurrencyService } from './currency.service';
import { RankingService } from './ranking.service';
import { AdapterRegistry, KNOWN_RETAILER_DOMAINS } from './adapters/adapter.registry';
import {
  KNOWN_RETAILER_DOMAINS_TOKEN,
  OpenWebSearchAdapter,
} from './adapters/open-web.adapter';
import { LinkValidatorService } from './crawling/link-validator.service';
import { ProductExtractorService } from './crawling/product-extractor.service';
import { WebSearchService } from './crawling/web-search.service';
import { BillingModule } from '../billing/billing.module';
import { ActivityModule } from '../activity/activity.module';
import { QueuesModule } from '../../queues/queues.module';
import { PricingCrawlaQueue } from '../../queues/pricing-crawla/pricing-crawla.queue';
import { PricingCrawlaProcessor } from '../../queues/pricing-crawla/pricing-crawla.processor';
import { PRICING_CRAWLA_QUEUE } from '../../queues/queue-names';

@Module({
  imports: [
    BillingModule,
    ActivityModule,
    QueuesModule,
    // The processor needs its queue instance available locally — we
    // register here (not in QueuesModule) to keep the dep edge inside
    // this feature module.
    BullModule.registerQueue({ name: PRICING_CRAWLA_QUEUE }),
  ],
  controllers: [PricingCrawlaController],
  providers: [
    PricingCrawlaService,
    PricingIntentService,
    CurrencyService,
    RankingService,
    AdapterRegistry,
    WebSearchService,
    LinkValidatorService,
    ProductExtractorService,
    OpenWebSearchAdapter,
    // Shared source of truth: domains already covered by site-specific
    // adapters. OpenWebSearchAdapter reads this via DI so the broad
    // search skips URLs that would duplicate a per-retailer crawl.
    { provide: KNOWN_RETAILER_DOMAINS_TOKEN, useValue: KNOWN_RETAILER_DOMAINS },
    PricingCrawlaQueue,
    PricingCrawlaProcessor,
  ],
  exports: [PricingCrawlaService, CurrencyService],
})
export class PricingCrawlaModule {}
