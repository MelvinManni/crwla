import { Injectable, Logger } from '@nestjs/common';
import { LinkValidatorService } from '../crawling/link-validator.service';
import { ProductExtractorService } from '../crawling/product-extractor.service';
import { WebSearchService } from '../crawling/web-search.service';
import type { SourceAdapter } from './source-adapter';
import { WebSearchAdapter, type RetailerConfig } from './web-search.adapter';

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

@Injectable()
export class AdapterRegistry {
  private readonly logger = new Logger(AdapterRegistry.name);
  private readonly adapters: SourceAdapter[];

  constructor(
    private readonly search: WebSearchService,
    private readonly validator: LinkValidatorService,
    private readonly extractor: ProductExtractorService,
  ) {
    this.adapters = RETAILERS.map(
      (r) => new WebSearchAdapter(r, this.search, this.validator, this.extractor),
    );
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
