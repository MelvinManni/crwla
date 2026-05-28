import { Logger } from '@nestjs/common';
import { LinkValidatorService } from '../crawling/link-validator.service';
import { ProductExtractorService } from '../crawling/product-extractor.service';
import { WebSearchService } from '../crawling/web-search.service';
import type { RawListing, SourceAdapter, SourceAdapterContext } from './source-adapter';

export type RetailerConfig = {
  id: string;
  storeName: string;
  /** Domain we restrict the site-search to ("amazon.com", "jumia.com.ng"). */
  domain: string;
  baselineTrust: number;
  category: SourceAdapter['category'];
  /** Max product pages we crawl per search (cost control). */
  maxResults?: number;
};

/**
 * Real adapter: web-search the retailer for the user's query, validate
 * every returned URL is live, fetch the page, extract real
 * title/price/image via JSON-LD / OG / microdata.
 *
 * Anything that fails to validate or extract gets dropped — the
 * `pricing_result` row is only written when we have a live URL and a
 * verifiable price.
 *
 * No fixtures, no fakery. Empty results when the crawler can't find
 * anything are honest results.
 */
export class WebSearchAdapter implements SourceAdapter {
  private readonly logger: Logger;

  readonly id: string;
  readonly storeName: string;
  readonly baselineTrust: number;
  readonly category: SourceAdapter['category'];

  private readonly domain: string;
  private readonly maxResults: number;

  constructor(
    cfg: RetailerConfig,
    private readonly search: WebSearchService,
    private readonly validator: LinkValidatorService,
    private readonly extractor: ProductExtractorService,
  ) {
    this.id = cfg.id;
    this.storeName = cfg.storeName;
    this.baselineTrust = cfg.baselineTrust;
    this.category = cfg.category;
    this.domain = cfg.domain;
    this.maxResults = cfg.maxResults ?? 3;
    this.logger = new Logger(`WebSearchAdapter:${cfg.id}`);
  }

  async fetch(ctx: SourceAdapterContext): Promise<RawListing[]> {
    const hits = await this.search.searchSite(ctx.productName, this.domain, this.maxResults);
    if (hits.length === 0) {
      this.logger.debug(`no search hits for "${ctx.productName}" on ${this.domain}`);
      return [];
    }

    // Validate + extract in parallel, bounded by maxResults so a single
    // slow retailer can't stall the run.
    const settled = await Promise.allSettled(
      hits.map(async (hit) => this.processHit(hit)),
    );

    const listings: RawListing[] = [];
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) listings.push(r.value);
    }
    return listings;
  }

  private async processHit(hit: {
    url: string;
    title: string;
    snippet: string;
  }): Promise<RawListing | null> {
    // 1. Link validation — drop dead URLs immediately.
    const v = await this.validator.validate(hit.url);
    if (!v.ok) {
      this.logger.debug(`drop (link ${v.reason}): ${hit.url}`);
      return null;
    }

    // 2. HTML extraction — drop pages without real title + price.
    const extracted = await this.extractor.extract(v.finalUrl);
    if (!extracted) {
      this.logger.debug(`drop (no extractable product): ${v.finalUrl}`);
      return null;
    }

    return {
      storeName: this.storeName,
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
      trustHint: this.baselineTrust,
      dealBadge: null,
      metadata: { brand: extracted.brand, searchTitle: hit.title, searchSnippet: hit.snippet },
    };
  }
}
