import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { AdminBillingController } from './admin-billing.controller';
import { BillingService } from './billing.service';
import { PlansService } from './plans.service';
import { PolarService } from './polar.service';
import { EntitlementsService } from './entitlements.service';
import { QueuesModule } from '../../queues/queues.module';
import { ScheduledPlanChangesQueue } from '../../queues/scheduled-plan-changes/scheduled-plan-changes.queue';
import { ScheduledPlanChangesProcessor } from '../../queues/scheduled-plan-changes/scheduled-plan-changes.processor';

@Module({
  // Importing QueuesModule re-exports BullModule so `@InjectQueue` works
  // inside the wrapper / processor below.
  imports: [QueuesModule],
  controllers: [BillingController, AdminBillingController],
  providers: [
    BillingService,
    PlansService,
    PolarService,
    EntitlementsService,
    ScheduledPlanChangesQueue,
    ScheduledPlanChangesProcessor,
  ],
  exports: [BillingService, EntitlementsService, PlansService, ScheduledPlanChangesQueue],
})
export class BillingModule {}
