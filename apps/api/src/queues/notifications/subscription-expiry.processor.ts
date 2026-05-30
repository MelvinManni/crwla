import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { SUBSCRIPTION_EXPIRY_QUEUE } from '../queue-names';

/**
 * Daily sweep that emails users whose subscription is about to lapse. The
 * single repeatable walks all near-expiry subscriptions each tick (see
 * NotificationsService.notifyExpiringSubscriptions). Concurrency 1 — one sweep
 * at a time is plenty.
 */
@Processor(SUBSCRIPTION_EXPIRY_QUEUE, { concurrency: 1 })
export class SubscriptionExpiryProcessor extends WorkerHost {
  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(_job: Job): Promise<{ checked: number; notified: number }> {
    return this.notifications.notifyExpiringSubscriptions();
  }
}
