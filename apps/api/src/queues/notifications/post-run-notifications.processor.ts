import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NOTIFICATIONS_QUEUE } from '../queue-names';

/**
 * Consumes the per-run notification jobs enqueued by ScrapeProcessor. Lives in
 * NotificationsModule (which imports BillingModule) so it can reach
 * EntitlementsService without pulling Billing into QueuesModule.
 */
@Processor(NOTIFICATIONS_QUEUE, { concurrency: 4 })
export class PostRunNotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(PostRunNotificationsProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job<{ searchId: string; runId: string }>): Promise<{ ok: true }> {
    await this.notifications.handlePostRun(job.data);
    return { ok: true };
  }
}
