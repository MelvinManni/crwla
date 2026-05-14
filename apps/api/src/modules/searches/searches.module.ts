import { Module } from '@nestjs/common';
import { SearchesController } from './searches.controller';
import { SearchesService } from './searches.service';
import { QueuesModule } from '../../queues/queues.module';
import { ScraperModule } from '../scraper/scraper.module';
import { BillingModule } from '../billing/billing.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [QueuesModule, ScraperModule, BillingModule, OnboardingModule],
  controllers: [SearchesController],
  providers: [SearchesService],
  exports: [SearchesService],
})
export class SearchesModule {}
