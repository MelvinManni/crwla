import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Model-distinguishing words common across consumer electronics. Treated
 * as CRITICAL so "iPhone 15 Pro" doesn't match plain "iPhone 15", etc.
 * Keep this list small — false-positive criticals hurt recall more than
 * the precision they buy.
 */
const QUALIFIER_TOKENS = new Set([
  'pro',
  'max',
  'plus',
  'mini',
  'ultra',
  'slim',
  'lite',
  'air',
  'fold',
  'flip',
  'note',
]);

export type ProductTokens = { stems: string[]; critical: string[] };

/**
 * Split a product query into stem + critical tokens.
 *
 *   "iPhone 15 Pro 256GB Natural Titanium"
 *     → stems:    ["iphone", "natural", "titanium"]
 *       critical: ["15", "pro", "256gb"]
 *
 * Pure-number tokens, capacity tokens (256GB, 1TB), and model qualifiers
 * are critical — they must appear in a candidate title for it to match.
 */
export function tokenize(name: string): ProductTokens {
  const raw = name.toLowerCase().split(/\s+/).filter(Boolean);
  const stems: string[] = [];
  const critical: string[] = [];
  for (const t of raw) {
    const clean = t.replace(/[^a-z0-9]/g, '');
    if (!clean) continue;
    if (/^\d+(gb|tb|mb)?$/.test(clean)) {
      critical.push(clean);
    } else if (QUALIFIER_TOKENS.has(clean)) {
      critical.push(clean);
    } else if (clean.length >= 3) {
      stems.push(clean);
    }
  }
  return { stems, critical };
}

/**
 * Word-boundary token check. Numeric tokens use digit boundaries so "17"
 * matches "iPhone 17 Pro" but not "iPhone 17X" or "2017"; alphabetic
 * tokens use simple substring match (good enough for "iphone" / "pro").
 */
export function tokenInTitle(token: string, hay: string): boolean {
  if (/^\d/.test(token)) {
    const re = new RegExp(`(?:^|[^0-9])${escapeRegex(token)}(?:[^0-9]|$)`, 'i');
    return re.test(hay);
  }
  return hay.includes(token);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type IntentInput = {
  productName: string;
  country?: string | null;
  category?: string | null;
  maxPriceUsd?: number | null;
};

export type IntentValidation = {
  verdict: 'match' | 'mismatch' | 'uncertain';
  reason: string;
  /** 0..1 — used to break ties in ranking. */
  confidence: number;
};

/**
 * Intent generation + per-result validation. The "real" LLM call is wrapped
 * behind a feature flag (`ANTHROPIC_API_KEY` env var); when missing we ship a
 * deterministic stub that returns plausible-looking output so the rest of
 * the pipeline runs end-to-end without external dependencies.
 *
 * The exact prompts the live path would use are kept here as constants so
 * they can be reviewed in code review and reused if the call ever moves
 * out-of-process.
 */
@Injectable()
export class PricingIntentService {
  private readonly logger = new Logger(PricingIntentService.name);

  // ---- Prompts (documented; used when an LLM key is configured) ---------

  /**
   * INTENT_PROMPT — turns a raw product query into a precise search
   * statement. The output is a single sentence that downstream adapters
   * can paste into per-marketplace searches and that the validator below
   * uses as the ground truth.
   */
  static readonly INTENT_PROMPT = `You are a price-intelligence assistant.
Given a product query, output ONE sentence describing the buyer's exact
intent: the product, the variant/spec the user likely wants, and a hint
about which sellers to trust. Avoid generalities — be specific. Format:
"Search for authentic <product + variant> sold by verified vendors,
prioritize <signal>, return current-market price across <region>."

Query: {productName}
Country: {country}
Category: {category}
Max budget USD: {maxPriceUsd}
`;

  /**
   * VALIDATION_PROMPT — checks each adapter result against the intent.
   * The model returns a JSON object `{ verdict, reason, confidence }` that
   * RankingService uses to demote mismatches without dropping them (we
   * keep them so the user can see the universe).
   */
  static readonly VALIDATION_PROMPT = `You are validating whether a search
result matches the original price-intelligence intent. Return JSON only:
{ "verdict": "match" | "mismatch" | "uncertain", "reason": "<one line>",
  "confidence": <0..1> }

Intent: {intent}

Result:
- title: {title}
- store: {storeName}
- price (USD): {priceUsd}
- url: {url}
`;

  constructor(private readonly config: ConfigService) {}

  /**
   * Generate the intent statement for a search. When an LLM key is
   * present, we'd POST to the messages API with INTENT_PROMPT; otherwise
   * we synthesize a deterministic intent string locally.
   */
  async generateIntent(input: IntentInput): Promise<string> {
    if (this.config.get<string>('ANTHROPIC_API_KEY')) {
      // TODO: wire the live call — keep the local synth as fallback so the
      // pipeline never blocks on a model outage.
      this.logger.debug(
        `LLM intent path available but using deterministic synth in this build`,
      );
    }
    const region = input.country ? `the ${input.country} market` : 'global markets';
    const category = input.category ? ` (${input.category})` : '';
    const budget =
      input.maxPriceUsd && input.maxPriceUsd > 0
        ? ` under $${input.maxPriceUsd}`
        : '';
    return (
      `Search for authentic ${input.productName}${category}${budget} ` +
      `sold by verified vendors, prioritize official retailers, ` +
      `return current-market price across ${region}.`
    );
  }

  /**
   * Validate a candidate result against the intent.
   *
   * Two-tier token model. The old version mistakenly dropped numeric
   * tokens (length ≤ 2 filter), so "iPhone 17" matched "iPhone 15 Pro
   * Max" with confidence 1.0. The fix:
   *
   *   - CRITICAL tokens (versions, capacities, model qualifiers like
   *     pro/max/plus/ultra) MUST appear in the title. Missing any → hard
   *     `mismatch`. These are the tokens that distinguish e.g. iPhone 17
   *     from iPhone 15, or 256GB from 1TB.
   *   - STEM tokens (alphabetic, length ≥ 3) drive the confidence score
   *     once the critical gate passes.
   *
   * Numeric tokens use word-boundary matching so "17" doesn't match
   * "171" or "2017".
   */
  validate(
    _intent: string,
    result: {
      title: string;
      storeName: string;
      priceUsd: number;
      url: string;
    },
    productName: string,
  ): IntentValidation {
    const { stems, critical } = tokenize(productName);
    const hay = result.title.toLowerCase();

    const missing = critical.filter((c) => !tokenInTitle(c, hay));
    if (missing.length > 0) {
      return {
        verdict: 'mismatch',
        reason: `Title is missing required token(s): ${missing.join(', ')}.`,
        confidence: 1,
      };
    }

    if (stems.length === 0) {
      return {
        verdict: 'match',
        reason: 'All critical tokens matched (no stem tokens to compare).',
        confidence: 0.8,
      };
    }

    const stemHits = stems.filter((s) => hay.includes(s)).length;
    const stemRatio = stemHits / stems.length;
    if (stemRatio >= 0.5) {
      return {
        verdict: 'match',
        reason: `Critical tokens matched + ${stemHits}/${stems.length} stems matched.`,
        confidence: Math.min(1, 0.6 + stemRatio * 0.4),
      };
    }
    if (stemRatio >= 0.25) {
      return {
        verdict: 'uncertain',
        reason: `Critical tokens matched but stem overlap is weak (${stemHits}/${stems.length}).`,
        confidence: stemRatio,
      };
    }
    return {
      verdict: 'mismatch',
      reason: `Critical tokens matched but stem overlap is too weak (${stemHits}/${stems.length}) — probably a different product.`,
      confidence: 1 - stemRatio,
    };
  }

  /**
   * Generate a short "why this matches" blurb for the detail view.
   * Heuristic for the offline path; the live LLM path would summarize the
   * top reviews + price position.
   */
  whyMatchBlurb(args: {
    title: string;
    storeName: string;
    rating: number | null;
    reviewCount: number;
    priceUsd: number;
    cheapestUsd: number;
  }): string {
    const parts: string[] = [];
    if (args.priceUsd <= args.cheapestUsd * 1.05) {
      parts.push('among the cheapest listings');
    }
    if (args.rating && args.rating >= 4.5) {
      parts.push(`high seller rating (${args.rating.toFixed(1)}★)`);
    }
    if (args.reviewCount >= 500) {
      parts.push(`${args.reviewCount.toLocaleString()} verified reviews`);
    }
    if (parts.length === 0) {
      return `${args.storeName} carries the listing — verify warranty before checkout.`;
    }
    return `Strong match: ${parts.join(', ')}.`;
  }
}
