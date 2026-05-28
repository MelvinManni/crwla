import { Injectable } from '@nestjs/common';
import type { RawListing } from './adapters/source-adapter';
import type { IntentValidation } from './ai/intent.service';

export type ScoredListing = RawListing & {
  priceUsd: number;
  trustScore: number;
  rankScore: number;
  percentile: number;
  intent: IntentValidation;
};

/**
 * Composite ranking. Higher `rankScore` = better.
 *
 * weights (sum to 1):
 *   price     0.55  — z-score-normalized, cheapest wins
 *   trust     0.25  — baseline + listing trustHint
 *   reviews   0.10  — log-scaled review volume
 *   rating    0.05  — listing rating
 *   intent    0.05  — 1 for match, 0.5 uncertain, 0 mismatch
 */
const W = { price: 0.55, trust: 0.25, reviews: 0.1, rating: 0.05, intent: 0.05 };

@Injectable()
export class RankingService {
  /** Combine listing trust hints with the adapter baseline. */
  trustFor(baselineTrust: number, listingTrust: number | undefined): number {
    if (listingTrust == null) return baselineTrust;
    return Math.max(baselineTrust, Math.min(1, baselineTrust * 0.6 + listingTrust * 0.4));
  }

  /**
   * Score the union of listings. Returns listings sorted cheapest-first
   * with `rankScore`, `percentile`, and `trustScore` set so the persistence
   * layer can write them directly.
   */
  score(
    listings: Array<RawListing & { priceUsd: number; trustScore: number; intent: IntentValidation }>,
  ): ScoredListing[] {
    if (listings.length === 0) return [];
    const prices = listings.map((l) => l.priceUsd).filter((p) => p > 0);
    const min = Math.min(...prices, 1);
    const max = Math.max(...prices, min);
    const span = Math.max(1, max - min);

    const scored = listings.map((l) => {
      // Price: 1 when cheapest, 0 when most expensive (videos with $0 sit at 1).
      const priceNorm = l.priceUsd <= 0 ? 1 : 1 - (l.priceUsd - min) / span;
      const reviewNorm = Math.min(1, Math.log10((l.reviewCount ?? 0) + 1) / 4);
      const ratingNorm = (l.rating ?? 0) / 5;
      const intentNorm =
        l.intent.verdict === 'match' ? 1 : l.intent.verdict === 'uncertain' ? 0.5 : 0;
      const rankScore =
        W.price * priceNorm +
        W.trust * l.trustScore +
        W.reviews * reviewNorm +
        W.rating * ratingNorm +
        W.intent * intentNorm;

      const percentile = max === min ? 0 : (l.priceUsd - min) / span;
      return {
        ...l,
        rankScore,
        percentile: Number.isFinite(percentile) ? Math.min(1, Math.max(0, percentile)) : 0,
      };
    });

    return scored.sort((a, b) => b.rankScore - a.rankScore);
  }

  /**
   * Pick exactly 3 alternatives — different products near the top-of-list
   * we'd suggest if the primary results aren't a fit. Heuristic: take the
   * 3 listings just below the kept set, prefer ones cheaper than the
   * primary winner.
   */
  alternatives<T extends { title: string; priceUsd: number; url: string; imageUrl?: string | null }>(
    all: T[],
    keptIds: Set<string | T>,
  ): T[] {
    const remaining = all.filter((l) => !keptIds.has(l as unknown as T));
    return remaining.sort((a, b) => a.priceUsd - b.priceUsd).slice(0, 3);
  }
}
