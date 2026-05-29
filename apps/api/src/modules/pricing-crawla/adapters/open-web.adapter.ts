import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { LinkValidatorService } from '../crawling/link-validator.service';
import { ProductExtractorService } from '../crawling/product-extractor.service';
import { WebSearchService } from '../crawling/web-search.service';
import type {
  RawListing,
  SourceAdapter,
  SourceAdapterContext,
} from './source-adapter';

/**
 * Injection token for the set of retailer domains that are already
 * covered by site-specific adapters. The registry provides the value; we
 * read it here to skip duplicate URLs.
 */
export const KNOWN_RETAILER_DOMAINS_TOKEN = Symbol(
  'PRICING_KNOWN_RETAILER_DOMAINS',
);

/**
 * Hard blocklist of domains that show up in product searches but never
 * carry an actual buy-it page (news, reviews, social, encyclopaedias).
 * Saves us a wasted Validator + Extractor round-trip per hit and keeps
 * the result list focused on commerce.
 */
const NON_COMMERCE_DOMAINS = new Set<string>([
  // News, reviews, encyclopaedias
  'wikipedia.org',
  'wikimedia.org',
  'theverge.com',
  'engadget.com',
  'techradar.com',
  'cnet.com',
  'arstechnica.com',
  'gizmodo.com',
  'tomshardware.com',
  'androidpolice.com',
  'macrumors.com',
  '9to5mac.com',
  '9to5google.com',
  'pcmag.com',
  'gsmarena.com',
  'phonearena.com',
  'mkbhd.com',
  'wired.com',
  'forbes.com',
  'businessinsider.com',
  'cnbc.com',
  'bloomberg.com',
  'reuters.com',
  'nytimes.com',
  'wsj.com',
  'medium.com',
  'substack.com',
  // Social
  'reddit.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'pinterest.com',
  'linkedin.com',
  // Q&A / community
  'quora.com',
  'stackoverflow.com',
  'stackexchange.com',
]);

/**
 * "Search the whole internet" adapter. Runs in the same parallel
 * fan-out as the site-specific adapters but uses a broad query (no
 * `site:` filter) to discover product listings on retailers we haven't
 * explicitly catalogued.
 *
 * Refinement pipeline (each gate drops anything that fails):
 *
 *   1. Known-retailer skip — if the host is already covered by a
 *      WebSearchAdapter the URL is dropped here so we don't double-count.
 *   2. Non-commerce blocklist — drops obvious news/review/social hosts
 *      before we spend a network round-trip on them.
 *   3. LinkValidator — drops dead URLs (HEAD/GET → must be 2xx/3xx).
 *   4. ProductExtractor — drops pages without an extractable title + price
 *      via JSON-LD Product, OG meta, or microdata. This is the strongest
 *      filter: editorial pages won't have these fields, only real product
 *      listings do.
 *   5. Per-listing storeName is derived from the URL host so the FE
 *      shows "Newegg" / "Mighty Ape" rather than a generic label.
 *
 * The intent validator + ranking layer + backfill mismatch filter then
 * apply on top, same as for site-specific adapters.
 *
 * Trust is intentionally lower than the curated retailers (baseline 0.45,
 * per-listing hint 0.4) so unknown retailers only outrank known ones
 * when the price is genuinely better.
 */
@Injectable()
export class OpenWebSearchAdapter implements SourceAdapter {
  private readonly logger = new Logger(OpenWebSearchAdapter.name);

  readonly id = 'open_web';
  readonly storeName = 'Open Web';
  readonly baselineTrust = 0.45;
  readonly category = 'marketplace' as const;

  /**
   * Hits we pull from DDG before host-filtering. One full SERP page is
   * ~30 organic results; we go a touch higher so a noisy run still has
   * enough candidates after dropping known retailers + non-commerce
   * hosts.
   */
  private static readonly SEARCH_LIMIT = 40;
  /**
   * Cap on validator+extractor invocations per run. We process more
   * aggressively now that we pull more candidates — ranking sorts the
   * full set and the processor only persists the top 10.
   */
  private static readonly PROCESS_LIMIT = 15;

  constructor(
    private readonly search: WebSearchService,
    private readonly validator: LinkValidatorService,
    private readonly extractor: ProductExtractorService,
    @Optional()
    @Inject(KNOWN_RETAILER_DOMAINS_TOKEN)
    private readonly knownDomains: ReadonlySet<string> = new Set(),
  ) {}

  async fetch(ctx: SourceAdapterContext): Promise<RawListing[]> {
    // "buy" / "price" bias the SERP toward shopping pages. Quote the
    // product name so DDG keeps the phrase intact (esp. for queries
    // like "PlayStation 5 Slim").
    const query = `"${ctx.productName}" buy price`;
    const hits = await this.search.search(
      query,
      OpenWebSearchAdapter.SEARCH_LIMIT,
    );
    if (hits.length === 0) {
      this.logger.debug(`no open-web hits for "${ctx.productName}"`);
      return [];
    }

    // Filter: drop known-retailer URLs + non-commerce hosts.
    const candidates: typeof hits = [];
    const seenHosts = new Set<string>();
    for (const h of hits) {
      const host = hostOf(h.url);
      if (!host) continue;
      if (this.isKnownRetailer(host)) continue;
      if (isNonCommerceHost(host)) continue;
      // De-dup at the host level too — DDG sometimes returns multiple
      // pages from the same shop; one per host is plenty.
      if (seenHosts.has(host)) continue;
      seenHosts.add(host);
      candidates.push(h);
      if (candidates.length >= OpenWebSearchAdapter.PROCESS_LIMIT) break;
    }

    if (candidates.length === 0) {
      this.logger.debug(
        `all ${hits.length} hits filtered out (known retailer / non-commerce)`,
      );
      return [];
    }

    const settled = await Promise.allSettled(
      candidates.map((h) => this.processHit(h)),
    );

    const out: RawListing[] = [];
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) out.push(r.value);
    }
    return out;
  }

  private async processHit(hit: {
    url: string;
    title: string;
    snippet: string;
  }): Promise<RawListing | null> {
    const v = await this.validator.validate(hit.url);
    if (!v.ok) {
      this.logger.debug(`drop (link ${v.reason}): ${hit.url}`);
      return null;
    }

    const extracted = await this.extractor.extract(v.finalUrl);
    if (!extracted) {
      this.logger.debug(`drop (no extractable product): ${v.finalUrl}`);
      return null;
    }

    const host = hostOf(v.finalUrl);
    const storeName = host ? storeNameFromHost(host) : this.storeName;

    return {
      storeName,
      source: this.id,
      title: extracted.title,
      url: v.finalUrl,
      priceNative: extracted.price,
      currencyNative: extracted.currency,
      imageUrl: extracted.imageUrl,
      youtubeUrl: null,
      rating: extracted.rating,
      reviewCount: extracted.reviewCount,
      reviews: [],
      // Lower per-listing trust hint — these come from retailers we
      // haven't explicitly vetted. Combined with the 0.45 baseline,
      // open-web listings only outrank known retailers when their
      // price advantage is genuine.
      trustHint: 0.4,
      dealBadge: null,
      metadata: {
        brand: extracted.brand,
        discoveredVia: 'open-web',
        host,
        searchSnippet: hit.snippet,
      },
    };
  }

  private isKnownRetailer(host: string): boolean {
    for (const k of this.knownDomains) {
      if (host === k || host.endsWith(`.${k}`)) return true;
    }
    return false;
  }
}

// ---------- Helpers --------------------------------------------------

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isNonCommerceHost(host: string): boolean {
  for (const k of NON_COMMERCE_DOMAINS) {
    if (host === k || host.endsWith(`.${k}`)) return true;
  }
  return false;
}

/**
 * Pretty store name derived from a hostname.
 *   newegg.com           → "Newegg"
 *   shop.example.co.uk   → "Example"
 *   mighty-ape.co.nz     → "Mighty Ape"
 */
function storeNameFromHost(host: string): string {
  const parts = host.split('.');
  // Drop common TLDs to land on the brand portion.
  const root = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return root
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}
