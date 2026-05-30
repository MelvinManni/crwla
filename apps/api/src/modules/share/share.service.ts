import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { fullName } from '../../common/name.util';

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

/**
 * Shape of the response served by the public `/api/p/:slug` endpoint.
 *
 * Intentionally narrower than the authenticated `SearchView` /
 * `ResultView`:
 *   - No internal CUIDs (search id, result id) — anonymous viewers don't
 *     need them and exposing them tempts cross-endpoint enumeration.
 *   - No `userId`, `fetchedAt`, `score`, `metadata`, `hidden`,
 *     `favoritedAt`, or anything else stored on the Result / Search
 *     rows that isn't user-visible content.
 *   - `ownerName` is included because the owner opted into a public
 *     share (signal of attribution). Keep it to a display name only —
 *     never expose email, team, or role.
 *
 * Anything added to this type must be reviewed for "would I be okay if
 * a stranger scraped this off `/p/<slug>`?".
 */
export type PublicSharedView = {
  search: {
    slug: string;
    name: string;
    keywords: string[];
    ownerName: string;
    lastRun: string;
  };
  results: Array<{
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

// Re-exported under the older name so existing imports keep working
// after the rename. Drop after the next release cycle.
export type SharedView = PublicSharedView;

/**
 * Public read-side for /p/<slug>. The only intentional public surface
 * for crawl data — everything else lives behind JwtAuthGuard. Returns
 * null when the slug is unknown OR the owner has flipped
 * `public_access` off; controllers render the same "limited access"
 * view in both cases so we don't leak the existence of revoked slugs.
 */
@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(
    slug: string,
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<PublicSharedView | null> {
    // `select` (not `include`) so Prisma only pulls the columns we
    // actually expose. If a future schema change adds a column we
    // mean to keep private, it won't accidentally land in the
    // response via a wildcard.
    const search = await this.prisma.search.findFirst({
      where: { shareSlug: slug, publicAccess: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        keywords: true,
        lastRunAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
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
        // Same defensive `select` — internal columns (urlHash,
        // titleHash, metadata, score, favoritedAt, hidden, fetchedAt,
        // searchVector, runId, searchId) stay server-side.
        select: {
          title: true,
          url: true,
          snippet: true,
          source: true,
          imageUrl: true,
          publishedAt: true,
          fetchedAt: true,
        },
      }),
    ]);

    return {
      search: {
        slug,
        name: search.name,
        keywords: search.keywords,
        ownerName: fullName(search.user),
        lastRun: relTime(search.lastRunAt) ?? 'never',
      },
      results: rows.map((r) => ({
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
