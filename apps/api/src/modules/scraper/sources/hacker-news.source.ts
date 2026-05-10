import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import { urlHash, type ScrapedItem } from '../google-news.service';
import type { SourceCrawler } from './source.types';

type HnHit = {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  url?: string | null;
  story_url?: string | null;
  author: string;
  points?: number | null;
  num_comments?: number | null;
  created_at_i: number;
  story_text?: string | null;
  comment_text?: string | null;
  _tags: string[];
};

@Injectable()
export class HackerNewsSource implements SourceCrawler {
  readonly id = 'hacker_news';
  readonly label = 'Hacker News';
  readonly category = 'forums' as const;
  private readonly logger = new Logger(HackerNewsSource.name);

  constructor(private readonly config: ConfigService) {}

  async searchKeyword(keyword: string): Promise<ScrapedItem[]> {
    const ua = this.config.get<string>('USER_AGENT', 'CRWLA/1.0');
    const q = encodeURIComponent(keyword);
    // Algolia HN — free, no auth. `search_by_date` for recency.
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=story&hitsPerPage=25`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': ua, accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`hn ${res.status} for "${keyword}"`);
        return [];
      }
      const json = (await res.json()) as { hits?: HnHit[] };
      const hits = json.hits ?? [];
      const items: ScrapedItem[] = [];
      for (const h of hits) {
        const title = h.title ?? h.story_title;
        const link =
          h.url ??
          h.story_url ??
          `https://news.ycombinator.com/item?id=${h.objectID}`;
        if (!title || !link) continue;
        const points = h.points ?? 0;
        const comments = h.num_comments ?? 0;
        const snippet = (h.story_text ?? h.comment_text ?? '')
          .replace(/<[^>]+>/g, '')
          .slice(0, 320);
        items.push({
          title,
          url: link,
          source: `HN · ${points}↑ · ${comments}💬`,
          snippet,
          publishedAt: h.created_at_i * 1000,
          imageUrl: null,
          urlHash: urlHash(link),
          matchedKeyword: keyword,
        });
      }
      return items;
    } catch (e) {
      this.logger.warn(`hn fetch failed for "${keyword}": ${(e as Error).message}`);
      return [];
    }
  }
}
