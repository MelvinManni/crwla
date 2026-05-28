import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobSearchController } from './job-search.controller';
import { AdminTrackedCompaniesController } from './admin-tracked-companies.controller';
import { JobSearchService } from './job-search.service';
import { AiRelevanceService } from './ai/ai-relevance.service';
import { FixtureCareerAdapter } from './adapters/fixture-career.adapter';
import { BillingModule } from '../billing/billing.module';
import { ActivityModule } from '../activity/activity.module';
import { QueuesModule } from '../../queues/queues.module';
import { JobSearchQueue } from '../../queues/job-search/job-search.queue';
import { JobSearchProcessor } from '../../queues/job-search/job-search.processor';
import { JOB_SEARCH_QUEUE } from '../../queues/queue-names';

@Module({
  imports: [
    BillingModule,
    ActivityModule,
    QueuesModule,
    BullModule.registerQueue({ name: JOB_SEARCH_QUEUE }),
  ],
  controllers: [JobSearchController, AdminTrackedCompaniesController],
  providers: [
    JobSearchService,
    AiRelevanceService,
    FixtureCareerAdapter,
    JobSearchQueue,
    JobSearchProcessor,
  ],
  exports: [JobSearchService],
})
export class JobSearchModule {}
