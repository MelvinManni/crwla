import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import { urlHash, type ScrapedItem } from '../google-news.service';
import type { SourceCrawler } from './source.types';

type BskyPost = {
  uri: string;
  cid: string;
  author: { handle: string; displayName?: string | null; avatar?: string | null };
  record: { text?: string; createdAt?: string };
  embed?: {
    images?: Array<{ thumb?: string; fullsize?: string; alt?: string }>;
    external?: { uri?: string; thumb?: string; title?: string; description?: string };
  };
  indexedAt: string;
};

@Injectable()
export class BlueskySource implements SourceCrawler {
  readonly id = 'bluesky';
  readonly label = 'Bluesky';
  readonly category = 'social' as const;
  private readonly logger = new Logger(BlueskySource.name);

  constructor(private readonly config: ConfigService) {}

  async searchKeyword(keyword: string): Promise<ScrapedItem[]> {
    const ua = this.config.get<string>('USER_AGENT', 'CRWLA/1.0');
    const q = encodeURIComponent(keyword);
    // Public AT-Proto search endpoint — no auth, sorted latest.
    const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${q}&limit=25&sort=latest`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': ua, accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`bluesky ${res.status} for "${keyword}"`);
        return [];
      }
      const json = (await res.json()) as { posts?: BskyPost[] };
      const posts = json.posts ?? [];
      const items: ScrapedItem[] = [];
      for (const p of posts) {
        // at:// URI → bsky.app permalink. Format:
        //   at://did:plc:.../app.bsky.feed.post/<rkey>
        const m = p.uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
        if (!m) continue;
        const link = `https://bsky.app/profile/${p.author.handle}/post/${m[2]}`;
        const text = (p.record.text ?? '').slice(0, 320);
        const image =
          p.embed?.images?.[0]?.fullsize ??
          p.embed?.images?.[0]?.thumb ??
          p.embed?.external?.thumb ??
          null;
        const created = p.record.createdAt ?? p.indexedAt;
        items.push({
          title:
            text.split('\n')[0].slice(0, 120) ||
            (p.embed?.external?.title ?? `Post by @${p.author.handle}`),
          url: link,
          source: `Bluesky · @${p.author.handle}`,
          snippet: text,
          publishedAt: created ? new Date(created).getTime() : null,
          imageUrl: image,
          urlHash: urlHash(link),
          matchedKeyword: keyword,
        });
      }
      return items;
    } catch (e) {
      this.logger.warn(`bluesky fetch failed for "${keyword}": ${(e as Error).message}`);
      return [];
    }
  }
}
