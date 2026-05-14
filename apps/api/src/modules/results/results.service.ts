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

function timeWindowToCutoff(t: string | undefined): Date | null {
  switch (t) {
    case '24h':
      return new Date(Date.now() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filter: FilterService,
  ) {}

  private async ownedSearch(userId: string, searchId: string) {
    const s = await this.prisma.search.findFirst({
      where: { id: searchId, userId, deletedAt: null },
    });
    if (!s) throw new NotFoundException('not found');
    return s;
  }

  async listFor(
    userId: string,
    searchId: string,
    opts: {
      page?: number;
      pageSize?: number;
      q?: string;
      keyword?: string;
      time?: string;
    } = {},
  ) {
    const search = await this.ownedSearch(userId, searchId);
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    // Build the WHERE clause once and reuse for both COUNT and the page
    // query so filters fire BEFORE LIMIT/OFFSET — otherwise filtering only
    // narrows the already-paginated slice.
    const conditions: string[] = ['search_id = $1', 'hidden = false'];
    const values: unknown[] = [searchId];
    let i = 2;
    const q = opts.q?.trim();
    if (q) {
      conditions.push(
        `(title ILIKE $${i} OR snippet ILIKE $${i} OR source ILIKE $${i})`,
      );
      values.push(`%${q}%`);
      i++;
    }
    const keyword = opts.keyword?.trim();
    if (keyword) {
      conditions.push(`(title ILIKE $${i} OR snippet ILIKE $${i})`);
      values.push(`%${keyword}%`);
      i++;
    }
    const cutoff = timeWindowToCutoff(opts.time);
    if (cutoff) {
      conditions.push(`COALESCE(published_at, fetched_at) >= $${i}`);
      values.push(cutoff);
      i++;
    }
    const whereSql = conditions.join(' AND ');

    const totalRow: Array<{ count: bigint }> = await this.prisma.$queryRawUnsafe(
      `SELECT count(*)::bigint AS count FROM result WHERE ${whereSql}`,
      ...values,
    );
    const total = Number(totalRow[0]?.count ?? 0);

    // Order by COALESCE(published_at, fetched_at) DESC — Prisma can't express
    // this directly so use $queryRaw against the snake_case table/column names.
    const rows: Array<{
      id: string;
      source: string;
      title: string;
      url: string;
      snippet: string | null;
      image_url: string | null;
      tag: string | null;
      published_at: Date | null;
      fetched_at: Date;
    }> = await this.prisma.$queryRawUnsafe(
      `SELECT id, source, title, url, snippet, image_url, tag, published_at, fetched_at
       FROM result
       WHERE ${whereSql}
       ORDER BY COALESCE(published_at, fetched_at) DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      ...values,
      pageSize,
      offset,
    );

    const results = rows.map((r) => ({
      id: r.id,
      source: r.source,
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      image: r.image_url,
      tag: r.tag,
      time: relTime(r.published_at ?? r.fetched_at),
      publishedAt: r.published_at ? r.published_at.getTime() : null,
    }));

    return {
      job: {
        id: search.id,
        name: search.name,
        cron: search.cron,
        filterPrompt: search.filterPrompt ?? '',
        strict: search.strict,
        status: search.status,
        keywords: search.keywords,
        lastRun: relTime(search.lastRunAt) ?? 'never',
      },
      // legacy and canonical keys
      results,
      items: results,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  async filterPrompt(userId: string, searchId: string, prompt: string) {
    const view = await this.listFor(userId, searchId, { pageSize: 200 });
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
