import { Injectable } from '@nestjs/common';
import { LinkValidatorService } from '../crawling/link-validator.service';
import { ProductExtractorService } from '../crawling/product-extractor.service';
import { WebSearchService } from '../crawling/web-search.service';
import type { SourceAdapter } from './source-adapter';
import { WebSearchAdapter, type RetailerConfig } from './web-search.adapter';
import { OpenWebSearchAdapter } from './open-web.adapter';

/**
 * Catalog of retailers we crawl. Adding a new one is a single line —
 * `WebSearchAdapter` handles everything else (search → validate →
 * extract). Trust scores are the baseline; per-listing extraction can
 * raise/lower them via `metadata`.
 */
const RETAILERS: ReadonlyArray<RetailerConfig> = [
  { id: 'amazon', storeName: 'Amazon', domain: 'amazon.com', baselineTrust: 0.95, category: 'marketplace' },
  { id: 'bestbuy', storeName: 'Best Buy', domain: 'bestbuy.com', baselineTrust: 0.9, category: 'marketplace' },
  { id: 'walmart', storeName: 'Walmart', domain: 'walmart.com', baselineTrust: 0.85, category: 'marketplace' },
  { id: 'jumia_ng', storeName: 'Jumia NG', domain: 'jumia.com.ng', baselineTrust: 0.72, category: 'marketplace' },
  { id: 'konga', storeName: 'Konga', domain: 'konga.com', baselineTrust: 0.66, category: 'marketplace' },
  { id: 'slot_mobile', storeName: 'Slot Mobile', domain: 'slot.ng', baselineTrust: 0.6, category: 'marketplace' },
  { id: 'back_market', storeName: 'Back Market', domain: 'backmarket.com', baselineTrust: 0.78, category: 'marketplace' },
  { id: 'apple', storeName: 'Apple (Official)', domain: 'apple.com', baselineTrust: 1.0, category: 'brand' },
  { id: 'samsung', storeName: 'Samsung (Official)', domain: 'samsung.com', baselineTrust: 1.0, category: 'brand' },
];

/**
 * Set of domains covered by site-specific adapters. Shared with the
 * OpenWebSearchAdapter so the broad search doesn't re-discover URLs
 * we're already crawling directly.
 */
export const KNOWN_RETAILER_DOMAINS: ReadonlySet<string> = new Set(
  RETAILERS.map((r) => r.domain),
);

@Injectable()
export class AdapterRegistry {
  private readonly adapters: SourceAdapter[];

  constructor(
    private readonly search: WebSearchService,
    private readonly validator: LinkValidatorService,
    private readonly extractor: ProductExtractorService,
    private readonly openWeb: OpenWebSearchAdapter,
  ) {
    const siteSpecific = RETAILERS.map(
      (r) => new WebSearchAdapter(r, this.search, this.validator, this.extractor),
    );
    // Open-web adapter runs in the same parallel fan-out as the
    // site-specific ones. It receives the known-domain set via Nest DI
    // (see PricingCrawlaModule providers).
    this.adapters = [...siteSpecific, this.openWeb];
  }

  all(): readonly SourceAdapter[] {
    return this.adapters;
  }

  /** Marketplace + brand adapters (no video adapters today — YouTube
   * enrichment runs as a separate pass on validated results). */
  forListings(): readonly SourceAdapter[] {
    return this.adapters.filter((a) => a.category !== 'video');
  }

  forVideos(): readonly SourceAdapter[] {
    return this.adapters.filter((a) => a.category === 'video');
  }
}
