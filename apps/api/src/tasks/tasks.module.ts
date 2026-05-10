import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { QueuesModule } from '../queues/queues.module';
import { BillingModule } from '../modules/billing/billing.module';

@Module({
  // BillingModule re-exports ScheduledPlanChangesQueue so SchedulerService
  // can arm the apply-due repeatable on boot.
  imports: [QueuesModule, BillingModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class TasksModule {}
