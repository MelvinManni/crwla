/**
 * Request/response shapes mirroring the standalone web-page-extractor-llm
 * service's `/extract` endpoint (apps/web-page-extractor-llm/src/schemas.py).
 * Keep these in sync if the service contract changes.
 */

export type LlmExtractInput = {
  /** Either url OR html is required. */
  url?: string;
  html?: string;
  goal: string;
  schema?: Record<string, unknown>;
  /** Few-shot retrieval bucket. Defaults server-side to the URL host. */
  bucket?: string;
  /** Skip the (url, goal, model) cache. */
  force?: boolean;
};

export type LlmExtractResult = {
  output: Record<string, unknown> | null;
  cached: boolean;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  confidence: number;
  fewShotUsed: Array<{ bucket: string; similarity: number }>;
  validationAttempts: string[];
};

/** Input for /search-products — the "query → ranked listings" surface. */
export type LlmProductSearchInput = {
  query: string;
  /** DDG SERP pages to walk; service caps at 10. */
  pages?: number;
  /** Max ranked results to return. */
  limit?: number;
  concurrency?: number;
  /** When false, only deterministic JSON-LD/OG/microdata is used. */
  useLlmFallback?: boolean;
};

export type LlmProductListing = {
  title: string;
  price: number;
  currency: string;
  url: string;
  store: string;
  image: string | null;
  brand: string | null;
  rating: number | null;
  reviewCount: number;
  source: 'quick' | 'llm';
  confidence: number;
  rankScore: number;
};

export type LlmProductSearchResult = {
  query: string;
  results: LlmProductListing[];
  stats: {
    searchHits: number;
    candidates: number;
    kept: number;
    quickExtract: number;
    llmExtract: number;
    failed: number;
    elapsedMs: number;
    pagesWalked: number;
  };
};
