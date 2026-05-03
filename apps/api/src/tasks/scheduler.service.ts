import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';
import { ScrapeQueue } from '../queues/scrape/scrape.queue';
import { SearchStatus } from '@prisma/client';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scrapeQueue: ScrapeQueue,
  ) {}

  async onModuleInit() {
    await this.reschedule();
  }

  /**
   * Idempotent: walks every non-paused search and registers/refreshes its
   * BullMQ repeatable. Called on boot and via the repair playbook.
   */
  async reschedule(): Promise<{ rescheduled: number }> {
    const searches = await this.prisma.search.findMany({
      where: { status: { not: SearchStatus.PAUSED } },
      select: { id: true, cron: true },
    });
    let n = 0;
    for (const s of searches) {
      try {
        await this.scrapeQueue.scheduleRepeatable(s.id, s.cron);
        n++;
      } catch (e) {
        this.logger.warn(`reschedule(${s.id}) failed: ${(e as Error).message}`);
      }
    }
    this.logger.log(`scheduler boot: ${n} repeatable(s) registered`);
    return { rescheduled: n };
  }
}
