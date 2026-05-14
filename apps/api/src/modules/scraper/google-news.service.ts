import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';

export type ScrapedItem = {
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedAt: number | null;
  imageUrl: string | null;
  urlHash: string;
  matchedKeyword: string;
};

// Tracking / analytics params we drop before hashing so the same article
// linked from different sources (with different utm/click ids) collapses
// to one Result row via the @@unique([searchId, urlHash]) constraint.
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'utm_reader',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'yclid',
  'ref',
  'ref_src',
  'ref_url',
  'referrer',
  'spm',
  '_hsenc',
  '_hsmi',
]);

export function canonicalizeUrl(input: string): string {
  try {
    const u = new URL(input.trim());
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    if (
      (u.protocol === 'http:' && u.port === '80') ||
      (u.protocol === 'https:' && u.port === '443')
    ) {
      u.port = '';
    }
    for (const k of Array.from(u.searchParams.keys())) {
      if (TRACKING_PARAMS.has(k.toLowerCase())) u.searchParams.delete(k);
    }
    // Sort remaining params so `?a=1&b=2` and `?b=2&a=1` collapse.
    const entries = Array.from(u.searchParams.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const next = new URLSearchParams();
    for (const [k, v] of entries) next.append(k, v);
    u.search = next.toString() ? `?${next.toString()}` : '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return input.trim();
  }
}

export function urlHash(u: string): string {
  return createHash('sha1').update(canonicalizeUrl(u)).digest('hex').slice(0, 16);
}

/**
 * Hash a title or snippet for the 2-of-3 duplicate constraint
 * `(searchId, title_hash, snippet_hash)`. Normalization is aggressive on
 * purpose — same article reposted with whitespace tweaks or capitalisation
 * differences should still collide. `null`/`''` both hash to the same value
 * so two rows missing a snippet are treated as identical on that axis.
 */
export function textHash(s: string | null | undefined): string {
  const normalized = (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha1').update(normalized).digest('hex').slice(0, 16);
}

function decodeEntities(s: string): string {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

@Injectable()
export class GoogleNewsService {
  private readonly logger = new Logger(GoogleNewsService.name);

  constructor(private readonly config: ConfigService) {}

  /** Google News RSS — reliable, no JS, gives source/time/snippet for free. */
  async searchKeyword(keyword: string): Promise<ScrapedItem[]> {
    const ua = this.config.get<string>('USER_AGENT', 'CRWLA/1.0');
    const hl = this.config.get<string>('DEFAULT_LOCALE', 'en-US');
    const gl = this.config.get<string>('DEFAULT_REGION', 'US');
    const q = encodeURIComponent(keyword);
    const url = `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split('-')[0]}`;
    const res = await fetch(url, { headers: { 'User-Agent': ua } });
    if (!res.ok) throw new Error(`Google News ${res.status}`);
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const items: ScrapedItem[] = [];
    $('item').each((_, el) => {
      const $el = $(el);
      const title = decodeEntities($el.find('title').text().trim());
      const link = $el.find('link').text().trim();
      const pub = $el.find('pubDate').text().trim();
      const source = $el.find('source').text().trim();
      const desc = $el.find('description').text().trim();

      let snippet = '';
      try {
        const $$ = cheerio.load(desc);
        snippet = $$.text().replace(title, '').replace(source, '').trim();
        if (!snippet) snippet = $$.root().find('a').first().text() || '';
      } catch {
        snippet = desc;
      }

      if (title && link) {
        items.push({
          title,
          url: link,
          source: source || 'Google News',
          snippet: snippet.slice(0, 320),
          publishedAt: pub ? new Date(pub).getTime() : null,
          imageUrl: null,
          urlHash: urlHash(link),
          matchedKeyword: keyword,
        });
      }
    });
    return items;
  }

  async runMulti(keywords: string[]): Promise<{ items: ScrapedItem[]; errors: Array<{ keyword: string; error: string }> }> {
    const seen = new Set<string>();
    const out: ScrapedItem[] = [];
    const errors: Array<{ keyword: string; error: string }> = [];

    await Promise.all(
      keywords.map(async (kw) => {
        try {
          const items = await this.searchKeyword(kw);
          for (const it of items) {
            if (seen.has(it.urlHash)) continue;
            seen.add(it.urlHash);
            out.push(it);
          }
        } catch (e) {
          errors.push({ keyword: kw, error: String((e as Error).message ?? e) });
        }
      }),
    );

    out.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
    return { items: out, errors };
  }
}
