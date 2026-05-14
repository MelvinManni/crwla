import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RunStatus, SearchStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ThumbnailService } from '../../modules/scraper/thumbnail.service';
import { SourceRegistry } from '../../modules/scraper/sources/source.registry';
import { DEFAULT_SOURCES } from '../../modules/scraper/sources/source.types';
import type { ScrapedItem } from '../../modules/scraper/google-news.service';
import { FilterService } from '../../modules/filter/filter.service';
import { ConfigService } from '@nestjs/config';
import { SearchIndexQueue } from '../search-index/search-index.queue';
import { SCRAPE_QUEUE } from '../queue-names';

@Processor(SCRAPE_QUEUE, { concurrency: 4 })
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: SourceRegistry,
    private readonly thumbnails: ThumbnailService,
    private readonly filter: FilterService,
    private readonly config: ConfigService,
    private readonly index: SearchIndexQueue,
  ) {
    super();
  }

  async process(job: Job<{ searchId: string }>) {
    const { searchId } = job.data;
    const search = await this.prisma.search.findUnique({
      where: { id: searchId },
      include: { user: { select: { disabledSourceCategories: true } } },
    });
    if (!search) throw new Error(`search ${searchId} not found`);
    if (search.status === SearchStatus.PAUSED) return { skipped: true };

    const startedAt = new Date();
    const run = await this.prisma.run.create({
      data: { searchId: search.id, startedAt, status: RunStatus.RUNNING },
    });

    try {
      // Resolve sources: stored selection ∩ user permissions. Default to
      // Google News when the search has no explicit sources (legacy data).
      const requested = search.sources.length > 0 ? search.sources : [...DEFAULT_SOURCES];
      const denied = search.user?.disabledSourceCategories ?? [];
      const crawlers = this.registry.resolve(requested, denied);

      if (crawlers.length === 0) {
        this.logger.warn(
          `search ${search.id}: no enabled sources (requested=${requested.join(',')} denied=${denied.join(',')})`,
        );
      }

      // Fan out across crawlers + keywords; collect errors per (source, keyword).
      const errors: Array<{ source: string; keyword: string; error: string }> = [];
      const merged = new Map<string, ScrapedItem>(); // urlHash → item (cross-source dedup)

      await Promise.all(
        crawlers.flatMap((c) =>
          search.keywords.map(async (kw) => {
            try {
              const got = await c.searchKeyword(kw);
              for (const it of got) {
                if (!merged.has(it.urlHash)) merged.set(it.urlHash, it);
              }
            } catch (e) {
              errors.push({
                source: c.id,
                keyword: kw,
                error: String((e as Error).message ?? e),
              });
            }
          }),
        ),
      );

      const items = Array.from(merged.values()).sort(
        (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0),
      );

      // Strict mode: a result must contain every keyword in its title or
      // snippet (case-insensitive). Per-source AND-queries aren't supported
      // uniformly across crawlers, so the intersection is enforced here.
      let kept = items;
      if (search.strict && search.keywords.length > 1) {
        const needles = search.keywords.map((k) => k.toLowerCase());
        kept = items.filter((it) => {
          const hay = `${it.title ?? ''} ${it.snippet ?? ''}`.toLowerCase();
          return needles.every((n) => hay.includes(n));
        });
      }

      // Apply LLM filter only when configured — heuristic at scrape time is
      // too risky (we'd drop data we can't recover). View-time filter handles
      // it otherwise.
      if (search.filterPrompt && this.config.get<string>('ANTHROPIC_API_KEY')) {
        const out = await this.filter.apply({ prompt: search.filterPrompt, items: kept });
        kept = out.items;
      }

      // Enrich with thumbnails (og:image / twitter:image / favicon fallback).
      // Best-effort — never fails the run; concurrency-bounded to avoid
      // hammering source sites.
      if (kept.length) {
        try {
          kept = await this.thumbnails.enrich(kept, 6);
        } catch (e) {
          this.logger.warn(`thumbnail enrichment failed: ${(e as Error).message}`);
        }
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
