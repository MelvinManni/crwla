import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 512 * 1024; // don't pull whole sites — head is enough

/**
 * Best-effort article-thumbnail extractor.
 *
 * For a given page URL we try, in priority order:
 *   1. og:image / og:image:secure_url / og:image:url
 *   2. twitter:image / twitter:image:src
 *   3. <link rel="image_src">
 *   4. JSON-LD `image`
 *   5. The first reasonable <img> in the article body
 *   6. Apple touch icon / favicon (last-resort site-level fallback)
 *
 * Returns an absolute URL or null. Never throws — the scraper should never
 * fail because a single page didn't render an OG image.
 */
@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);

  constructor(private readonly config: ConfigService) {}

  async forUrl(targetUrl: string): Promise<string | null> {
    try {
      const html = await this.fetchHead(targetUrl);
      if (!html) return null;
      const $ = cheerio.load(html);

      const og =
        $('meta[property="og:image:secure_url"]').attr('content') ||
        $('meta[property="og:image:url"]').attr('content') ||
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="og:image"]').attr('content');
      if (og) return this.absolutize(og, targetUrl);

      const tw =
        $('meta[name="twitter:image"]').attr('content') ||
        $('meta[name="twitter:image:src"]').attr('content') ||
        $('meta[property="twitter:image"]').attr('content');
      if (tw) return this.absolutize(tw, targetUrl);

      const linkImg = $('link[rel="image_src"]').attr('href');
      if (linkImg) return this.absolutize(linkImg, targetUrl);

      const jsonLd = this.fromJsonLd($);
      if (jsonLd) return this.absolutize(jsonLd, targetUrl);

      const articleImg = this.fromArticleBody($);
      if (articleImg) return this.absolutize(articleImg, targetUrl);

      const fav = this.fromFavicons($);
      if (fav) return this.absolutize(fav, targetUrl);

      // Final fallback — Google's favicon proxy is small but always returns
      // *something* recognizable for a domain.
      try {
        const u = new URL(targetUrl);
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=128`;
      } catch {
        return null;
      }
    } catch (e) {
      this.logger.debug(`thumbnail fetch failed for ${targetUrl}: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Concurrency-bounded enrichment for a batch — used after a Google News
   * scrape so we can give the worker a list of items and get them back with
   * `imageUrl` populated.
   */
  async enrich<T extends { url: string; imageUrl: string | null }>(
    items: T[],
    concurrency = 6,
  ): Promise<T[]> {
    if (items.length === 0) return items;

    const queue = items.map((it, i) => ({ it, i }));
    const out = items.slice();

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        if (next.it.imageUrl) continue; // already has one
        const img = await this.forUrl(next.it.url);
        if (img) out[next.i] = { ...next.it, imageUrl: img };
      }
    });

    await Promise.all(workers);
    return out;
  }

  private async fetchHead(targetUrl: string): Promise<string | null> {
    const ua = this.config.get<string>('USER_AGENT', 'CRWLA/1.0');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(targetUrl, {
        headers: { 'User-Agent': ua, accept: 'text/html,application/xhtml+xml' },
        redirect: 'follow',
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const ctype = res.headers.get('content-type') ?? '';
      if (!ctype.includes('html')) return null;

      // Read up to MAX_HTML_BYTES — most og:* and link tags live in <head>
      // which is well within this budget.
      const reader = res.body?.getReader();
      if (!reader) return await res.text();

      const decoder = new TextDecoder('utf-8');
      let html = '';
      let bytes = 0;
      while (bytes < MAX_HTML_BYTES) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
        // Once we've seen </head> we're done — head is all we need.
        if (html.includes('</head>')) break;
      }
      try {
        await reader.cancel();
      } catch {}
      return html;
    } finally {
      clearTimeout(timer);
    }
  }

  private absolutize(src: string, base: string): string | null {
    try {
      return new URL(src, base).toString();
    } catch {
      return null;
    }
  }

  private fromJsonLd($: cheerio.CheerioAPI): string | null {
    const blocks = $('script[type="application/ld+json"]')
      .map((_, el) => $(el).contents().text())
      .get();
    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block);
        const found = pickImageFromJsonLd(parsed);
        if (found) return found;
      } catch {
        /* ignore malformed json-ld */
      }
    }
    return null;
  }

  private fromArticleBody($: cheerio.CheerioAPI): string | null {
    const candidates = [
      'article img[src]',
      'main img[src]',
      '[role="main"] img[src]',
      'figure img[src]',
      'img[src]',
    ];
    for (const sel of candidates) {
      const el = $(sel).first();
      const src = el.attr('src') || el.attr('data-src');
      if (src && !src.startsWith('data:') && !/(spacer|pixel|tracking|1x1)\b/i.test(src)) {
        return src;
      }
    }
    return null;
  }

  private fromFavicons($: cheerio.CheerioAPI): string | null {
    const apple = $('link[rel~="apple-touch-icon"]').attr('href');
    if (apple) return apple;
    const icon = $('link[rel~="icon"]').attr('href');
    return icon ?? null;
  }
}

function pickImageFromJsonLd(node: unknown): string | null {
  if (!node) return null;
  if (typeof node === 'string') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = pickImageFromJsonLd(n);
      if (r) return r;
    }
    return null;
  }
  if (typeof node !== 'object') return null;

  const obj = node as Record<string, unknown>;
  const img = obj.image;
  if (typeof img === 'string') return img;
  if (img && typeof img === 'object') {
    const url = (img as Record<string, unknown>).url;
    if (typeof url === 'string') return url;
    const r = pickImageFromJsonLd(img);
    if (r) return r;
  }
  // Recurse into common nested keys (e.g. `@graph`).
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (v && typeof v === 'object') {
      const r = pickImageFromJsonLd(v);
      if (r) return r;
    }
  }
  return null;
}
