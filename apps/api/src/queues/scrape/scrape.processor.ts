import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma, RunStatus, SearchStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { GoogleNewsService } from '../../modules/scraper/google-news.service';
import { FilterService } from '../../modules/filter/filter.service';
import { ConfigService } from '@nestjs/config';
import { SearchIndexQueue } from '../search-index/search-index.queue';
import { SCRAPE_QUEUE } from '../queue-names';

@Processor(SCRAPE_QUEUE, { concurrency: 4 })
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleNewsService,
    private readonly filter: FilterService,
    private readonly config: ConfigService,
    private readonly index: SearchIndexQueue,
  ) {
    super();
  }

  async process(job: Job<{ searchId: string }>) {
    const { searchId } = job.data;
    const search = await this.prisma.search.findUnique({ where: { id: searchId } });
    if (!search) throw new Error(`search ${searchId} not found`);
    if (search.status === SearchStatus.PAUSED) return { skipped: true };

    const startedAt = new Date();
    const run = await this.prisma.run.create({
      data: { searchId: search.id, startedAt, status: RunStatus.RUNNING },
    });

    try {
      const { items, errors } = await this.google.runMulti(search.keywords);

      // Apply LLM filter only when configured — heuristic at scrape time is
      // too risky (we'd drop data we can't recover). View-time filter handles
      // it otherwise.
      let kept = items;
      if (search.filterPrompt && this.config.get<string>('ANTHROPIC_API_KEY')) {
        const out = await this.filter.apply({ prompt: search.filterPrompt, items });
        kept = out.items;
      }

      let inserted: Array<{ id: string }> = [];
      if (kept.length) {
        // Use createManyAndReturn for IDs to forward to the indexer.
        // Prisma 6 supports this on Postgres.
        inserted = await this.prisma.result.createManyAndReturn({
          data: kept.map((r) => ({
            searchId: search.id,
            runId: run.id,
            source: r.source,
            title: r.title,
            url: r.url,
            urlHash: r.urlHash,
            snippet: r.snippet,
            imageUrl: r.imageUrl,
            publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
          })),
          skipDuplicates: true,
          select: { id: true, title: true, url: true, snippet: true, source: true, publishedAt: true, fetchedAt: true },
        }) as unknown as Array<{ id: string }>;
      }

      const finishedAt = new Date();
      const errored = errors.length > 0 && inserted.length === 0;
      await this.prisma.run.update({
        where: { id: run.id },
        data: {
          finishedAt,
          status: errored ? RunStatus.ERROR : RunStatus.OK,
          resultsCount: inserted.length,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          error: errors.length ? JSON.stringify(errors) : null,
        },
      });

      await this.prisma.search.update({
        where: { id: search.id },
        data: {
          lastRunAt: finishedAt,
          lastError: errors.length ? JSON.stringify(errors) : null,
          ...(search.status === SearchStatus.ERROR ? { status: SearchStatus.RUNNING } : {}),
        },
      });

      // Fan-out to search-index queue (best-effort).
      if (inserted.length) {
        await this.index.bulkIndex(inserted as unknown as Array<{ id: string }>);
      }

      return { runId: run.id, inserted: inserted.length, total: kept.length, errors };
    } catch (err) {
      const finishedAt = new Date();
      await this.prisma.run.update({
        where: { id: run.id },
        data: {
          finishedAt,
          status: RunStatus.ERROR,
          error: String((err as Error).message ?? err),
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        },
      });
      await this.prisma.search.update({
        where: { id: search.id },
        data: { status: SearchStatus.ERROR, lastError: String((err as Error).message ?? err) },
      });
      throw err;
    }
  }
}
