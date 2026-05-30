import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma, TrackedCompanyStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { COMPANY_SYNC_QUEUE } from '../queue-names';
import { DiscoveryClient, DiscoveryCompany } from './discovery.client';

const PAGE_SIZE = 1000;
const MAX_PAGES = 1000; // safety bound (=1M companies) against a runaway loop

/**
 * Daily sync: pages through the discovery service's `/companies` extract
 * endpoint and upserts each verified company into TrackedCompany.
 *
 * Idempotent (keyed on the unique `name`), so a partial run — or an extra
 * manual run — is always safe. The upsert refreshes the discovery-sourced
 * fields (careerUrl, selector, metadata) but preserves locally-managed
 * fields (status, crawlIntervalMin, jobCount, lastCrawled) so admin tuning
 * is never clobbered. Concurrency 1 to avoid overlapping syncs.
 */
@Processor(COMPANY_SYNC_QUEUE, { concurrency: 1 })
export class CompanySyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CompanySyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discovery: DiscoveryClient,
  ) {
    super();
  }

  async process(_job: Job): Promise<{ fetched: number; upserted: number }> {
    if (!this.discovery.isEnabled()) {
      this.logger.warn('DISCOVERY_SERVICE_URL not set — skipping company sync');
      return { fetched: 0, upserted: 0 };
    }

    let offset = 0;
    let fetched = 0;
    let upserted = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await this.discovery.fetchPage(offset, PAGE_SIZE);
      if (!data) break; // error already logged; next run resumes (idempotent)
      if (data.companies.length === 0) break;

      fetched += data.companies.length;
      for (const c of data.companies) {
        try {
          await this.upsert(c);
          upserted++;
        } catch (e) {
          this.logger.warn(`upsert "${c.name}" failed: ${(e as Error).message}`);
        }
      }

      offset += data.companies.length;
      if (data.companies.length < PAGE_SIZE) break; // last page
    }

    this.logger.log(`company-sync done: fetched=${fetched} upserted=${upserted}`);
    return { fetched, upserted };
  }

  private async upsert(c: DiscoveryCompany): Promise<void> {
    const name = c.name.trim();
    if (!name || !c.careerUrl) return;

    const metadata = {
      ...(c.metadata ?? {}),
      source: 'discovery',
      discoveryUpdatedAt: c.updatedAt,
    } as Prisma.InputJsonValue;

    await this.prisma.trackedCompany.upsert({
      where: { name },
      update: {
        careerUrl: c.careerUrl,
        selector: c.selector,
        metadata,
      },
      create: {
        name,
        careerUrl: c.careerUrl,
        selector: c.selector,
        crawlIntervalMin: c.crawlIntervalMin,
        status: mapStatus(c.status),
        metadata,
      },
    });
  }
}

/** Map the discovery service's status to the API's TrackedCompanyStatus enum. */
function mapStatus(s: string): TrackedCompanyStatus {
  switch (s.toUpperCase()) {
    case 'PAUSED':
    case 'ARCHIVED': // no ARCHIVED in the API enum — park it as PAUSED
      return TrackedCompanyStatus.PAUSED;
    case 'ERROR':
      return TrackedCompanyStatus.ERROR;
    default:
      return TrackedCompanyStatus.ACTIVE;
  }
}
