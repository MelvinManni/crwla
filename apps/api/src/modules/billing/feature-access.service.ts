import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import {
  ALL_FEATURE_KEYS,
  evaluate,
  FEATURES,
  type FeatureKey,
} from './features.registry';

export type FeatureCheck = {
  key: FeatureKey;
  allowed: boolean;
  reason: string | null;
  /** Display label from the registry — convenient for the FE. */
  label: string;
  /** Minimum tier copy ("Starter or higher"). */
  requiresLabel: string;
  /** Quota state for features with a monthly cap (null when N/A). */
  quotaUsed: number | null;
  quotaCap: number | null;
};

/**
 * Single chokepoint for "does this user have access to feature X?"
 *
 * Source of truth is the live DB:
 *   user → subscription → plan.limits (JSON column) → boolean flag + cap
 *
 * Nothing here is hardcoded per-feature: callers pass a `FeatureKey` and
 * the registry tells the evaluator which `PlanLimits` field to read.
 * Adding a new feature is a single entry in `features.registry.ts`.
 *
 * The legacy per-feature `assertX` methods on EntitlementsService now
 * delegate here so there's only one place that decides "allowed or not".
 */
@Injectable()
export class FeatureAccessService {
  private readonly logger = new Logger(FeatureAccessService.name);

  constructor(private readonly entitlements: EntitlementsService) {}

  // ---------- Read ----------------------------------------------------

  async check(userId: string, key: FeatureKey): Promise<FeatureCheck> {
    const ent = await this.entitlements.ensureFor(userId);
    const verdict = evaluate(ent, key);
    const def = FEATURES[key];
    return {
      key,
      label: def.label,
      requiresLabel: def.requiresLabel,
      ...verdict,
    };
  }

  /**
   * Convenience: returns the full key → check map for a user. The FE
   * calls this once on mount to drive sidebar gating, upgrade cards, and
   * "Pro" lock badges without a round-trip per feature.
   */
  async accessMap(userId: string): Promise<Record<FeatureKey, FeatureCheck>> {
    const ent = await this.entitlements.ensureFor(userId);
    const out = {} as Record<FeatureKey, FeatureCheck>;
    for (const key of ALL_FEATURE_KEYS) {
      const def = FEATURES[key];
      const verdict = evaluate(ent, key);
      out[key] = {
        key,
        label: def.label,
        requiresLabel: def.requiresLabel,
        ...verdict,
      };
    }
    return out;
  }

  // ---------- Assert / consume ----------------------------------------

  /**
   * Throws `ForbiddenException({ code: 'PLAN_LIMIT_EXCEEDED' })` when
   * access is denied. Use this from feature-service write paths before
   * accepting work.
   */
  async require(userId: string, key: FeatureKey): Promise<void> {
    const check = await this.check(userId, key);
    if (!check.allowed) {
      throw new ForbiddenException({
        message: check.reason ?? `${check.label} is not available on your plan.`,
        code: 'PLAN_LIMIT_EXCEEDED',
        feature: key,
      });
    }
  }

  /**
   * Combine `require()` + monthly-usage increment. Only valid for
   * features whose registry entry sets `usageField`. Throws if the gate
   * fails OR if the registry entry has no usage field (programmer error).
   */
  async consume(userId: string, key: FeatureKey): Promise<void> {
    await this.require(userId, key);
    const def = FEATURES[key];
    if (!def.usageField) {
      throw new Error(
        `FeatureAccessService.consume("${key}") called but the registry entry has no usageField.`,
      );
    }
    const sub = await this.entitlements.resolveSubscription(userId);
    await this.entitlements.incrementUsage(sub.id, {
      [def.usageField]: 1,
    });
  }
}
