import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { QueuesModule } from '../queues/queues.module';
import { BillingModule } from '../modules/billing/billing.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
  // BillingModule re-exports ScheduledPlanChangesQueue and NotificationsModule
  // exports SubscriptionExpiryQueue so SchedulerService can arm both
  // repeatables on boot.
  imports: [QueuesModule, BillingModule, NotificationsModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class TasksModule {}
