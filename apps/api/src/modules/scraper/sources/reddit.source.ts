import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import { urlHash, type ScrapedItem } from '../google-news.service';
import type { SourceCrawler } from './source.types';

type RedditChild = {
  kind: string;
  data: {
    id: string;
    title: string;
    selftext?: string;
    subreddit_name_prefixed?: string;
    subreddit?: string;
    author?: string;
    permalink: string;
    url?: string;
    url_overridden_by_dest?: string;
    created_utc?: number;
    thumbnail?: string;
    preview?: { images?: Array<{ source?: { url?: string } }> };
    over_18?: boolean;
  };
};

@Injectable()
export class RedditSource implements SourceCrawler {
  readonly id = 'reddit';
  readonly label = 'Reddit';
  readonly category = 'social' as const;
  private readonly logger = new Logger(RedditSource.name);

  constructor(private readonly config: ConfigService) {}

  async searchKeyword(keyword: string): Promise<ScrapedItem[]> {
    const ua = this.config.get<string>('USER_AGENT', 'CRWLA/1.0');
    const q = encodeURIComponent(keyword);
    // `restrict_sr=on=false&sort=new&t=week` — cross-subreddit, fresh-first
    const url = `https://www.reddit.com/search.json?q=${q}&sort=new&t=week&limit=25`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': ua, accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`reddit ${res.status} for "${keyword}"`);
        return [];
      }
      const json = (await res.json()) as { data?: { children?: RedditChild[] } };
      const children = json.data?.children ?? [];
      const items: ScrapedItem[] = [];
      for (const c of children) {
        if (c.kind !== 't3') continue; // only posts
        const d = c.data;
        if (d.over_18) continue; // skip NSFW
        const link = `https://www.reddit.com${d.permalink}`;
        const sub = d.subreddit_name_prefixed ?? (d.subreddit ? `r/${d.subreddit}` : 'Reddit');
        const image =
          (d.preview?.images?.[0]?.source?.url || '').replace(/&amp;/g, '&') ||
          (d.thumbnail && d.thumbnail.startsWith('http') ? d.thumbnail : '') ||
          null;
        items.push({
          title: d.title,
          url: link,
          source: `Reddit · ${sub}`,
          snippet: (d.selftext ?? '').slice(0, 320),
          publishedAt: d.created_utc ? d.created_utc * 1000 : null,
          imageUrl: image || null,
          urlHash: urlHash(link),
          matchedKeyword: keyword,
        });
      }
      return items;
    } catch (e) {
      this.logger.warn(`reddit fetch failed for "${keyword}": ${(e as Error).message}`);
      return [];
    }
  }
}
