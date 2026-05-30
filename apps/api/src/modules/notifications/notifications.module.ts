import { Module } from '@nestjs/common';
import { QueuesModule } from '../../queues/queues.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsService } from './notifications.service';
import { PostRunNotificationsProcessor } from '../../queues/notifications/post-run-notifications.processor';
import { SubscriptionExpiryProcessor } from '../../queues/notifications/subscription-expiry.processor';
import { SubscriptionExpiryQueue } from '../../queues/notifications/subscription-expiry.queue';

/**
 * Owns the user-facing notification emails (alert-hit, crawl-digest,
 * subscription-expiring) and the two processors that drive them.
 *
 * - QueuesModule re-exports BullModule so `@InjectQueue` works in the
 *   processors / wrapper below.
 * - BillingModule provides EntitlementsService for the email gate + metering.
 * - MailerService is injected from the @Global MailModule.
 *
 * The processors live under `src/queues/notifications/` (file convention) but
 * are provided here so their Billing dependency doesn't leak into QueuesModule
 * and create a Queues↔Billing cycle — same pattern as ScheduledPlanChanges.
 */
@Module({
  imports: [QueuesModule, BillingModule],
  providers: [
    NotificationsService,
    PostRunNotificationsProcessor,
    SubscriptionExpiryProcessor,
    SubscriptionExpiryQueue,
  ],
  exports: [SubscriptionExpiryQueue],
})
export class NotificationsModule {}
