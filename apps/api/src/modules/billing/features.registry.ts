import type { PlanLimits } from './plans.catalog';
import type { Entitlements } from './entitlements.service';

/**
 * Stable, public feature keys. These are what the FE asks about and what
 * `features.require()` / `features.consume()` accept.
 *
 * Naming: snake_case so the values are safe in URLs, query keys, and
 * error payloads. The `flag` they map to in `PlanLimits` stays camelCase.
 *
 * Adding a feature is a single new entry — no new EntitlementsService
 * method, no new controller method. The DB-stored `plan.limits` JSON is
 * the source of truth; this registry just tells the gate which fields to
 * read.
 */
export type FeatureKey =
  | 'pricing_crawla'
  | 'job_search'
  | 'webhooks'
  | 'result_sharing'
  | 'api_access'
  | 'custom_email_domain'
  | 'scheduled_exports'
  | 'location_search'
  | 'smart_filtering'
  | 'keyword_generator'
  | 'shared_searches'
  | 'rbac';

/** Bool-only fields on PlanLimits we can gate against. */
type BoolLimitField = {
  [K in keyof PlanLimits]: PlanLimits[K] extends boolean ? K : never;
}[keyof PlanLimits];

/** Numeric fields on PlanLimits we can use as monthly caps. */
type NumberLimitField = {
  [K in keyof PlanLimits]: PlanLimits[K] extends number ? K : never;
}[keyof PlanLimits];

/** Counters on `Entitlements.usage` (and the UsageMeter table). */
type UsageField =
  | 'manualRuns'
  | 'scheduledRuns'
  | 'emailAlerts'
  | 'smsAlerts'
  | 'whatsappAlerts'
  | 'csvExports'
  | 'pricingCrawlaSearches'
  | 'jobSearches';

export type FeatureDef = {
  /** Display name used in error messages and the upgrade modal. */
  label: string;
  /** Human-readable minimum tier ("Starter or higher", "Pro or higher"). */
  requiresLabel: string;
  /** PlanLimits boolean that must be true. */
  flag: BoolLimitField;
  /** Optional: PlanLimits numeric cap. -1 = unlimited, 0 = locked. */
  monthlyCapField?: NumberLimitField;
  /** Optional: usage column to read + bump. */
  usageField?: UsageField;
};

/**
 * All gated features. Order is preserved when `accessMap()` returns the
 * full map so the FE renders consistently.
 *
 * NB: keep this in sync with `PlanLimits` (apps/api/.../plans.catalog.ts).
 * The TypeScript types above will fail compilation if a flag/cap/usage
 * field name doesn't exist on the underlying type.
 */
export const FEATURES: Record<FeatureKey, FeatureDef> = {
  pricing_crawla: {
    label: 'Pricing Crawla',
    requiresLabel: 'Starter or higher',
    flag: 'pricingCrawla',
    monthlyCapField: 'pricingCrawlaSearchesPerMonth',
    usageField: 'pricingCrawlaSearches',
  },
  job_search: {
    label: 'Job Search',
    requiresLabel: 'Starter or higher',
    flag: 'jobSearch',
    monthlyCapField: 'jobSearchesPerMonth',
    usageField: 'jobSearches',
  },
  webhooks: {
    label: 'Webhooks',
    requiresLabel: 'Pro or higher',
    flag: 'webhooks',
  },
  result_sharing: {
    label: 'Public result sharing',
    requiresLabel: 'Pro or higher',
    flag: 'resultSharing',
  },
  api_access: {
    label: 'API access',
    requiresLabel: 'Business',
    flag: 'apiAccess',
  },
  custom_email_domain: {
    label: 'Custom email domain',
    requiresLabel: 'Business',
    flag: 'customEmailDomain',
  },
  scheduled_exports: {
    label: 'Scheduled exports',
    requiresLabel: 'Business',
    flag: 'scheduledExports',
  },
  location_search: {
    label: 'Location-based searches',
    requiresLabel: 'Basic or higher',
    flag: 'locationSearch',
  },
  smart_filtering: {
    label: 'Smart filtering & duplicate detection',
    requiresLabel: 'Starter or higher',
    flag: 'smartFiltering',
  },
  keyword_generator: {
    label: 'Keyword generator (AI)',
    requiresLabel: 'Pro or higher',
    flag: 'keywordGenerator',
  },
  shared_searches: {
    label: 'Shared searches & alerts',
    requiresLabel: 'Business',
    flag: 'sharedSearches',
  },
  rbac: {
    label: 'Role-based permissions',
    requiresLabel: 'Business',
    flag: 'rbac',
  },
};

export const ALL_FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

/**
 * Pure evaluator — takes an already-loaded entitlements snapshot and a
 * feature key and returns the access decision. Kept separate from the
 * service so the same logic can be reused in tests, the bulk
 * `accessMap()` path, and any future server-rendered check.
 */
export function evaluate(
  ent: Entitlements,
  key: FeatureKey,
): {
  allowed: boolean;
  reason: string | null;
  quotaUsed: number | null;
  quotaCap: number | null;
} {
  const def = FEATURES[key];
  const limits = ent.limits;

  // 1. Plan-flag gate. False here always wins — quota is irrelevant if
  //    the user's tier doesn't include the feature at all.
  const enabled = limits[def.flag];
  if (!enabled) {
    return {
      allowed: false,
      reason: `${def.label} requires ${def.requiresLabel}.`,
      quotaUsed: null,
      quotaCap: null,
    };
  }

  // 2. Optional monthly quota. -1 = unlimited, 0 wouldn't be reachable
  //    here because flag would also be false on locked tiers — defensive
  //    `<= 0` check covers misconfiguration.
  if (def.monthlyCapField && def.usageField) {
    const cap = limits[def.monthlyCapField] as number;
    const used = ent.usage[def.usageField] as number;
    if (cap < 0) {
      return { allowed: true, reason: null, quotaUsed: used, quotaCap: -1 };
    }
    if (used >= cap) {
      return {
        allowed: false,
        reason: `${def.label} quota reached (${used}/${cap}). Upgrade for more monthly usage.`,
        quotaUsed: used,
        quotaCap: cap,
      };
    }
    return { allowed: true, reason: null, quotaUsed: used, quotaCap: cap };
  }

  return { allowed: true, reason: null, quotaUsed: null, quotaCap: null };
}
