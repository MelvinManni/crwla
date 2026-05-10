import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ElasticsearchService } from '../../integrations/elasticsearch/es.service';

export type SearchHit = {
  id: string;
  title: string;
  snippet: string | null;
  url: string;
  source: string;
  location: string | null;
  publishedAt: number | null;
  score: number | null;
  highlight?: string;
};

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly es: ElasticsearchService,
  ) {}

  async search(params: {
    q: string;
    sources?: string[];
    locations?: string[];
    since?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ mode: 'es' | 'fts'; hits: SearchHit[] }> {
    const limit = params.limit ?? 25;
    const offset = params.offset ?? 0;

    if (this.es.enabled) {
      const must: Record<string, unknown>[] = [
        { multi_match: { query: params.q, fields: ['search_text^2', 'title^3', 'snippet'] } },
      ];
      const filter: Record<string, unknown>[] = [];
      if (params.sources?.length) filter.push({ terms: { source: params.sources } });
      if (params.locations?.length) filter.push({ terms: { location: params.locations } });
      if (params.since) filter.push({ range: { createdAt: { gte: params.since.toISOString() } } });

      const res = (await this.es.search({
        size: limit,
        from: offset,
        query: { bool: { must, filter } },
        highlight: { fields: { snippet: { fragment_size: 160, number_of_fragments: 1 } } },
      })) as { hits?: { hits?: Array<{ _id: string; _score: number; _source: Record<string, unknown>; highlight?: { snippet?: string[] } }> } } | null;

      const hits = (res?.hits?.hits ?? []).map((h): SearchHit => {
        const s = h._source as {
          title: string;
          snippet: string | null;
          url: string;
          source: string;
          location: string | null;
          publishedAt: string | null;
        };
        return {
          id: h._id,
          title: s.title,
          snippet: s.snippet,
          url: s.url,
          source: s.source,
          location: s.location,
          publishedAt: s.publishedAt ? new Date(s.publishedAt).getTime() : null,
          score: h._score,
          highlight: h.highlight?.snippet?.[0],
        };
      });
      return { mode: 'es', hits };
    }

    // Postgres FTS fallback — websearch_to_tsquery for natural-language input.
    const q = params.q;
    const sources = params.sources ?? [];
    const locations = params.locations ?? [];
    const since = params.since ?? null;

    const rows: Array<{
      id: string;
      title: string;
      snippet: string | null;
      url: string;
      source: string;
      location: string | null;
      published_at: Date | null;
      rank: number;
    }> = await this.prisma.$queryRawUnsafe(
      `SELECT id, title, snippet, url, source, location, published_at,
              ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS rank
       FROM result
       WHERE search_vector @@ websearch_to_tsquery('english', $1)
         AND ($2::text[] = '{}' OR source = ANY($2::text[]))
         AND ($3::text[] = '{}' OR location = ANY($3::text[]))
         AND ($4::timestamp IS NULL OR fetched_at >= $4)
         AND hidden = false
       ORDER BY rank DESC, fetched_at DESC
       LIMIT $5 OFFSET $6`,
      q,
      sources,
      locations,
      since,
      limit,
      offset,
    );

    return {
      mode: 'fts',
      hits: rows.map((r) => ({
        id: r.id,
        title: r.title,
        snippet: r.snippet,
        url: r.url,
        source: r.source,
        location: r.location,
        publishedAt: r.published_at ? r.published_at.getTime() : null,
        score: r.rank,
      })),
    };
  }
}
