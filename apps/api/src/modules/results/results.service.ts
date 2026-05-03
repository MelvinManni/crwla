import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FilterService, FilterItem } from '../filter/filter.service';

function relTime(t: Date | null | undefined): string | null {
  if (!t) return null;
  const diff = Date.now() - t.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filter: FilterService,
  ) {}

  private async ownedSearch(userId: string, searchId: string) {
    const s = await this.prisma.search.findFirst({ where: { id: searchId, userId } });
    if (!s) throw new NotFoundException('not found');
    return s;
  }

  async listFor(userId: string, searchId: string, limit = 200) {
    const search = await this.ownedSearch(userId, searchId);

    // Order by COALESCE(publishedAt, fetchedAt) DESC — Prisma can't express
    // this directly so use $queryRaw with the actual table/column casing.
    const rows: Array<{
      id: string;
      source: string;
      title: string;
      url: string;
      snippet: string | null;
      imageUrl: string | null;
      tag: string | null;
      publishedAt: Date | null;
      fetchedAt: Date;
    }> = await this.prisma.$queryRawUnsafe(
      `SELECT id, source, title, url, snippet, "imageUrl", tag, "publishedAt", "fetchedAt"
       FROM "Result"
       WHERE "searchId" = $1 AND hidden = false
       ORDER BY COALESCE("publishedAt", "fetchedAt") DESC
       LIMIT $2`,
      searchId,
      limit,
    );

    return {
      job: {
        id: search.id,
        name: search.name,
        cron: search.cron,
        filterPrompt: search.filterPrompt ?? '',
        status: search.status,
        keywords: search.keywords,
        lastRun: relTime(search.lastRunAt) ?? 'never',
      },
      results: rows.map((r) => ({
        id: r.id,
        source: r.source,
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        image: r.imageUrl,
        tag: r.tag,
        time: relTime(r.publishedAt ?? r.fetchedAt),
        publishedAt: r.publishedAt ? r.publishedAt.getTime() : null,
      })),
    };
  }

  async filterPrompt(userId: string, searchId: string, prompt: string) {
    const view = await this.listFor(userId, searchId);
    const items: FilterItem[] = view.results.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      source: r.source,
    }));
    const out = await this.filter.apply({ prompt, items });
    const keptIds = new Set(out.items.map((i) => i.id));
    const shaped = view.results.filter((r) => keptIds.has(r.id));
    return { results: shaped, mode: out.mode, prompt };
  }
}
