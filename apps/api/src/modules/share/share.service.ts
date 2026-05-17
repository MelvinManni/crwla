import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

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

export type SharedView = {
  search: {
    id: string;
    slug: string;
    name: string;
    keywords: string[];
    ownerName: string;
    lastRun: string;
  };
  results: Array<{
    id: string;
    title: string;
    url: string;
    snippet: string | null;
    source: string;
    image: string | null;
    publishedAt: number | null;
    time: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/**
 * Public read-side for /p/<slug>. Returns null when the slug is unknown
 * OR the owner has flipped `public_access` off — controllers should
 * render the same "limited access" view in both cases so we don't leak
 * the existence of revoked slugs.
 */
@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(
    slug: string,
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<SharedView | null> {
    const search = await this.prisma.search.findFirst({
      where: { shareSlug: slug, publicAccess: true, deletedAt: null },
      include: { user: { select: { name: true } } },
    });
    if (!search) return null;

    const page = Math.max(1, pagination.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, pagination.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      this.prisma.result.count({
        where: { searchId: search.id, hidden: false },
      }),
      this.prisma.result.findMany({
        where: { searchId: search.id, hidden: false },
        orderBy: [
          { publishedAt: { sort: 'desc', nulls: 'last' } },
          { fetchedAt: 'desc' },
        ],
        skip: offset,
        take: pageSize,
      }),
    ]);

    return {
      search: {
        id: search.id,
        slug,
        name: search.name,
        keywords: search.keywords,
        ownerName: search.user.name,
        lastRun: relTime(search.lastRunAt) ?? 'never',
      },
      results: rows.map((r) => ({
        id: r.id,
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        source: r.source,
        image: r.imageUrl,
        publishedAt: r.publishedAt ? r.publishedAt.getTime() : null,
        time: relTime(r.publishedAt ?? r.fetchedAt),
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }
}
