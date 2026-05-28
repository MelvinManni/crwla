/**
 * Per-source adapter interface. Every adapter (Amazon, Jumia, Konga,
 * Alibaba, brand-direct, YouTube, social-commerce) implements this.
 *
 * The processor fans out across adapters in parallel, merges + dedupes
 * results in the ranking layer, and persists the top 20 + 3 alternatives.
 *
 * `RawListing` is the cross-adapter shape — currency-native prices are
 * normalized to USD by the processor before insertion.
 */
export type RawListing = {
  storeName: string;
  /** Stable source id ("amazon", "jumia", …) — matches the adapter id. */
  source: string;
  title: string;
  url: string;
  priceNative: number;
  currencyNative: string;
  imageUrl?: string | null;
  youtubeUrl?: string | null;
  rating?: number | null;
  reviewCount?: number;
  /** Optional store-specific reviews — adapters that can fetch them inline. */
  reviews?: Array<{
    author: string;
    rating: number;
    body: string;
    postedAt?: Date | null;
  }>;
  /** Trust signal in [0..1]. Higher = more trustworthy. */
  trustHint?: number;
  /** Per-listing badge ("15% OFF", "REFURB"). */
  dealBadge?: string | null;
  metadata?: Record<string, unknown>;
};

export type SourceAdapterContext = {
  intent: string;
  productName: string;
  country?: string | null;
  category?: string | null;
  maxPriceUsd?: number | null;
};

export interface SourceAdapter {
  /** Stable id used by the registry + persistence layer. */
  readonly id: string;
  /** Human label rendered on the FE. */
  readonly storeName: string;
  /**
   * Trust baseline for the marketplace (not the listing). Combined with
   * the per-listing `trustHint` in ranking.
   */
  readonly baselineTrust: number;
  /** Free-form category for analytics: "marketplace" | "brand" | "social" | "video". */
  readonly category: 'marketplace' | 'brand' | 'social' | 'video';
  fetch(ctx: SourceAdapterContext): Promise<RawListing[]>;
}
