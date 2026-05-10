import { Injectable } from '@nestjs/common';
import { GoogleNewsSource } from './google-news.source';
import { RedditSource } from './reddit.source';
import { HackerNewsSource } from './hacker-news.source';
import { BlueskySource } from './bluesky.source';
import type { SourceCategory, SourceCrawler, SourceMeta } from './source.types';

@Injectable()
export class SourceRegistry {
  private readonly sources: SourceCrawler[];

  constructor(
    google: GoogleNewsSource,
    reddit: RedditSource,
    hn: HackerNewsSource,
    bsky: BlueskySource,
  ) {
    this.sources = [google, reddit, hn, bsky];
  }

  /** Every source the host has compiled in. Hidden ones are not filtered out here. */
  all(): ReadonlyArray<SourceMeta> {
    return this.sources.map(toMeta);
  }

  /**
   * Sources visible to the operator picker. Drops sources whose
   * `isAvailable()` returns false (e.g. missing API key) and any source
   * whose category is in `disabledCategories`.
   */
  availableFor(disabledCategories: ReadonlyArray<string> = []): SourceMeta[] {
    const denied = new Set(disabledCategories);
    return this.sources
      .filter((s) => s.isAvailable === undefined || s.isAvailable())
      .filter((s) => !denied.has(s.category))
      .map(toMeta);
  }

  /**
   * Resolve the crawler list for a scrape run. Drops:
   *   - unknown source ids (silently ignored — we don't want a stale UI
   *     selection to abort a run)
   *   - sources whose category is in the user's denylist
   *   - sources that are unavailable in this environment
   */
  resolve(
    sourceIds: ReadonlyArray<string>,
    disabledCategories: ReadonlyArray<string> = [],
  ): SourceCrawler[] {
    const denied = new Set(disabledCategories);
    const want = new Set(sourceIds);
    return this.sources.filter(
      (s) =>
        want.has(s.id) &&
        !denied.has(s.category) &&
        (s.isAvailable === undefined || s.isAvailable()),
    );
  }

  byId(id: string): SourceCrawler | undefined {
    return this.sources.find((s) => s.id === id);
  }

  /**
   * Resolve the set of source ids a user is entitled to, given their plan's
   * allowed categories and the admin's per-user denylist. The intersection
   * of these two is what the search creator silently records as the
   * search's `sources` array. Order is `SourceRegistry.all()` order — stable
   * across calls.
   */
  idsForUser(input: {
    allowedCategories: ReadonlyArray<string>;
    deniedCategories: ReadonlyArray<string>;
  }): string[] {
    const allowed = new Set(input.allowedCategories);
    const denied = new Set(input.deniedCategories);
    return this.sources
      .filter((s) => s.isAvailable === undefined || s.isAvailable())
      .filter((s) => allowed.size === 0 || allowed.has(s.category))
      .filter((s) => !denied.has(s.category))
      .map((s) => s.id);
  }

  /**
   * Validate a list of requested source ids against a user's denylist.
   * Returns the ids the user *cannot* access (so callers can throw a
   * useful error). Returns [] when everything is allowed.
   */
  forbidden(
    sourceIds: ReadonlyArray<string>,
    disabledCategories: ReadonlyArray<string> = [],
  ): { id: string; category: SourceCategory; label: string }[] {
    const denied = new Set(disabledCategories);
    const out: { id: string; category: SourceCategory; label: string }[] = [];
    for (const id of sourceIds) {
      const s = this.byId(id);
      if (!s) continue; // unknown ids are tolerated, see resolve()
      if (denied.has(s.category)) {
        out.push({ id: s.id, category: s.category, label: s.label });
      }
    }
    return out;
  }
}

function toMeta(s: SourceCrawler): SourceMeta {
  return { id: s.id, label: s.label, category: s.category, isAvailable: s.isAvailable };
}
