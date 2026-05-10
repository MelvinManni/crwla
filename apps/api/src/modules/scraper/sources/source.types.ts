import type { ScrapedItem } from '../google-news.service';

/**
 * Coarse-grained category. Per-user permissions gate at this level — admins
 * disable a whole category (e.g. "social") rather than naming individual
 * sources, so adding a new social network in the future automatically falls
 * under existing user denylists.
 */
export const SOURCE_CATEGORIES = ['news', 'social', 'forums', 'blogs'] as const;
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

export type SourceMeta = {
  /** Stable, lowercase, snake_case identifier — persisted in Search.sources. */
  id: string;
  /** Human-friendly label rendered in the search builder. */
  label: string;
  category: SourceCategory;
  /**
   * Optional gate: if it returns false, the source is hidden from pickers
   * and skipped at scrape time. Used to flag sources that need an API key
   * the host hasn't supplied (e.g. Twitter/X).
   */
  isAvailable?: () => boolean;
};

export interface SourceCrawler extends SourceMeta {
  /**
   * Crawl a single keyword on this source. Implementations must:
   *   - Return [] (not throw) on transient failures so one bad source
   *     can't kill the run for the rest.
   *   - Set a stable `urlHash` (sha1 prefix) so dedup works across runs.
   *   - Set `source` to a human-readable name (e.g. "Reddit r/funding"),
   *     not the source id.
   */
  searchKeyword(keyword: string): Promise<ScrapedItem[]>;
}

export const DEFAULT_SOURCES: ReadonlyArray<string> = ['google_news'];
