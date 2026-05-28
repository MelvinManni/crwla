import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

export type SearchHit = {
  url: string;
  title: string;
  snippet: string;
};

/**
 * Real web-search helper used by the pricing pipeline to discover product
 * URLs on a given retailer.
 *
 * Implementation: DuckDuckGo HTML endpoint. No API key, returns real
 * organic result links. We unwrap the `/l/?uddg=…` redirect wrapper so
 * downstream code sees the original retailer URL.
 *
 * Production hardening (proxy rotation, captcha solver, sponsored-result
 * filtering) lives elsewhere — keep this service narrow and replace it
 * with a paid SERP API when scale demands it.
 */
@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly userAgent: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.userAgent = config.get<string>(
      'USER_AGENT',
      'Mozilla/5.0 (compatible; CRWLA/1.0; +https://crwla.com/bot)',
    );
    this.timeoutMs = Number(config.get<string>('WEB_SEARCH_TIMEOUT_MS') ?? 10_000);
  }

  /**
   * Search a single site for a product query.
   *   searchSite("iPhone 17 Pro", "amazon.com") → list of amazon.com URLs
   */
  async searchSite(query: string, site: string, limit = 4): Promise<SearchHit[]> {
    const q = `${query} site:${site}`;
    const hits = await this.search(q, limit * 2);
    // Defensive: keep only URLs whose host matches the site filter.
    return hits
      .filter((h) => h.url.includes(site))
      .slice(0, limit);
  }

  async search(q: string, limit = 10): Promise<SearchHit[]> {
    const params = new URLSearchParams({ q, kl: 'us-en' });
    const url = `https://html.duckduckgo.com/html/?${params.toString()}`;
    const html = await this.fetchHtml(url);
    if (!html) return [];
    const $ = cheerio.load(html);
    const hits: SearchHit[] = [];
    $('a.result__a').each((_, a) => {
      if (hits.length >= limit) return;
      const href = $(a).attr('href');
      const title = $(a).text().trim();
      if (!href || !title) return;
      const decoded = unwrapDdgRedirect(href);
      if (!decoded) return;
      const snippet = $(a)
        .closest('.result')
        .find('.result__snippet')
        .text()
        .trim()
        .slice(0, 280);
      hits.push({ url: decoded, title, snippet });
    });
    return hits;
  }

  private async fetchHtml(url: string): Promise<string | null> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        this.logger.warn(`DDG returned ${res.status} for ${url}`);
        return null;
      }
      return await res.text();
    } catch (e) {
      this.logger.warn(`DDG fetch failed: ${(e as Error).message}`);
      return null;
    } finally {
      clearTimeout(t);
    }
  }
}

/**
 * DDG wraps every result in `https://duckduckgo.com/l/?uddg=<encoded>&rut=…`.
 * Unwrap the inner URL so downstream code sees the real retailer link.
 * Some results are bare URLs already — pass those through unchanged.
 */
function unwrapDdgRedirect(href: string): string | null {
  try {
    if (href.startsWith('//')) href = `https:${href}`;
    if (!/^https?:/.test(href)) return null;
    const u = new URL(href);
    if (u.hostname.endsWith('duckduckgo.com') && u.pathname === '/l/') {
      const inner = u.searchParams.get('uddg');
      if (inner) return decodeURIComponent(inner);
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}
