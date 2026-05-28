import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

export type ExtractedProduct = {
  title: string;
  /** USD-normalized? No — this is the raw price in the site's currency. */
  price: number;
  currency: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  /** Whatever brand / seller text we could pull from the page. */
  brand: string | null;
  /** URL we actually used (after redirect chain) — kept for transparency. */
  url: string;
};

/**
 * Fetches a product page and extracts real data from it.
 *
 * Extraction strategy, in order of trust:
 *   1. JSON-LD `Product` (schema.org) — most retailers ship this and it's
 *      machine-readable. Highest fidelity.
 *   2. OG product meta tags (`og:title`, `og:image`, `product:price:amount`)
 *   3. Microdata (`itemprop="name|price|image"`)
 *
 * Returns null when none of the strategies produce a usable title + price.
 * The processor drops nulls so the user never sees a listing we couldn't
 * verify on the live page.
 */
@Injectable()
export class ProductExtractorService {
  private readonly logger = new Logger(ProductExtractorService.name);
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(config: ConfigService) {
    this.timeoutMs = Number(config.get<string>('PRODUCT_EXTRACTOR_TIMEOUT_MS') ?? 12_000);
    this.userAgent = config.get<string>(
      'USER_AGENT',
      'Mozilla/5.0 (compatible; CRWLA/1.0; +https://crwla.com/bot)',
    );
  }

  async extract(url: string): Promise<ExtractedProduct | null> {
    const html = await this.fetchHtml(url);
    if (!html) return null;
    const $ = cheerio.load(html);

    const fromJsonLd = this.extractJsonLd($);
    const fromMeta = this.extractMeta($);
    const fromMicrodata = this.extractMicrodata($);

    // Merge: prefer JSON-LD, fill gaps from OG, then microdata. Title
    // and price are required — drop the listing if both strategies miss.
    const title = fromJsonLd?.title ?? fromMeta?.title ?? fromMicrodata?.title ?? null;
    const price =
      fromJsonLd?.price ?? fromMeta?.price ?? fromMicrodata?.price ?? null;
    if (!title || price == null || price <= 0) {
      this.logger.debug(`drop: missing title or price for ${url}`);
      return null;
    }
    const currency =
      fromJsonLd?.currency ?? fromMeta?.currency ?? fromMicrodata?.currency ?? 'USD';
    const imageUrl =
      fromJsonLd?.imageUrl ?? fromMeta?.imageUrl ?? fromMicrodata?.imageUrl ?? null;

    return {
      title: title.trim().slice(0, 240),
      price,
      currency: currency.toUpperCase().slice(0, 4),
      imageUrl,
      rating: fromJsonLd?.rating ?? null,
      reviewCount: fromJsonLd?.reviewCount ?? 0,
      brand: fromJsonLd?.brand ?? null,
      url,
    };
  }

  // ---------- HTML fetch -----------------------------------------------

  private async fetchHtml(url: string): Promise<string | null> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('html')) return null;
      const text = await res.text();
      return text.slice(0, 2_500_000);
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  // ---------- JSON-LD --------------------------------------------------

  private extractJsonLd($: cheerio.CheerioAPI): Partial<ExtractedProduct> | null {
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const el of scripts) {
      const raw = $(el).text().trim();
      if (!raw) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      const products = flatten(parsed).filter((n) => isProductNode(n));
      for (const p of products) {
        const offers = collectOffers(p);
        const firstOffer = offers[0];
        if (!firstOffer) continue;
        const price = num(firstOffer.price ?? firstOffer.lowPrice ?? firstOffer.highPrice);
        if (price == null) continue;
        const aggregate = p.aggregateRating as Record<string, unknown> | undefined;
        return {
          title: str(p.name),
          price,
          currency: str(firstOffer.priceCurrency) ?? 'USD',
          imageUrl: firstImageUrl(p.image),
          rating: num(aggregate?.ratingValue),
          reviewCount: Math.round(num(aggregate?.reviewCount ?? aggregate?.ratingCount) ?? 0),
          brand: typeof p.brand === 'string' ? p.brand : str((p.brand as { name?: unknown })?.name),
          url: '',
        };
      }
    }
    return null;
  }

  // ---------- OG / Twitter meta ---------------------------------------

  private extractMeta($: cheerio.CheerioAPI): Partial<ExtractedProduct> | null {
    const title =
      $('meta[property="og:title"]').attr('content') ??
      $('meta[name="twitter:title"]').attr('content') ??
      $('title').first().text();
    const image =
      $('meta[property="og:image"]').attr('content') ??
      $('meta[name="twitter:image"]').attr('content');
    const priceRaw =
      $('meta[property="product:price:amount"]').attr('content') ??
      $('meta[property="og:price:amount"]').attr('content');
    const currency =
      $('meta[property="product:price:currency"]').attr('content') ??
      $('meta[property="og:price:currency"]').attr('content');
    const price = num(priceRaw);
    if (!title?.trim()) return null;
    return {
      title: title.trim(),
      price: price ?? undefined,
      currency: currency ?? undefined,
      imageUrl: image ?? null,
    } as Partial<ExtractedProduct>;
  }

  // ---------- Microdata -----------------------------------------------

  private extractMicrodata($: cheerio.CheerioAPI): Partial<ExtractedProduct> | null {
    const scope = $('[itemtype*="schema.org/Product"]').first();
    if (!scope.length) return null;
    const name = scope.find('[itemprop="name"]').first().text().trim();
    const price = num(
      scope.find('[itemprop="price"]').attr('content') ??
        scope.find('[itemprop="price"]').first().text(),
    );
    const currency =
      scope.find('[itemprop="priceCurrency"]').attr('content') ?? undefined;
    const image =
      scope.find('[itemprop="image"]').attr('src') ??
      scope.find('[itemprop="image"]').attr('content') ??
      null;
    if (!name || price == null) return null;
    return { title: name, price, currency, imageUrl: image };
  }
}

// ---------- Helpers ----------------------------------------------------

/** Walk a parsed JSON-LD tree and yield every object node we find. */
function flatten(node: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(node)) return node.flatMap((n) => flatten(n));
  if (node && typeof node === 'object') {
    const cur = node as Record<string, unknown>;
    const out = [cur];
    if (Array.isArray(cur['@graph'])) {
      out.push(...flatten(cur['@graph']));
    }
    return out;
  }
  return [];
}

function isProductNode(n: Record<string, unknown>): boolean {
  const t = n['@type'];
  if (typeof t === 'string') return t === 'Product' || t === 'IndividualProduct';
  if (Array.isArray(t)) return t.some((x) => typeof x === 'string' && (x === 'Product' || x === 'IndividualProduct'));
  return false;
}

function collectOffers(p: Record<string, unknown>): Array<Record<string, unknown>> {
  const o = p.offers;
  if (!o) return [];
  if (Array.isArray(o)) return o as Array<Record<string, unknown>>;
  if (typeof o === 'object') {
    const offer = o as Record<string, unknown>;
    if (Array.isArray(offer.offers)) return offer.offers as Array<Record<string, unknown>>;
    return [offer];
  }
  return [];
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3})/g, '');
    const n = parseFloat(cleaned.replace(/,/g, '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function firstImageUrl(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x === 'string');
    if (typeof first === 'string') return first;
    const obj = v.find((x) => x && typeof x === 'object' && 'url' in x);
    if (obj) return str((obj as { url: unknown }).url) ?? null;
  }
  if (v && typeof v === 'object') {
    return str((v as { url?: unknown }).url) ?? null;
  }
  return null;
}
