// CRWLA pricing — single source of truth.
//
// `PlansService.seed()` upserts these into the Plan table on every boot.
// Bumping a number here is the entire change — migrations not required.
//
// Polar product/price ids live in env vars (POLAR_PRODUCT_*, POLAR_PRICE_*)
// and are merged in at seed time. The `tier` field is the stable join key.

import type { PlanTier } from '@prisma/client';

/**
 * Numeric caps. -1 means unlimited.
 *
 * `cron` is the set of CRON presets allowed; an empty array means
 * scheduling is disabled (manual-only).
 */
export type PlanLimits = {
  savedSearches: number;
  keywordsPerSearch: number;
  bulkKeywordImport: number;
  manualRunsPerMonth: number;
  scheduledRunsPerSearchPerMonth: number;
  emailAlerts: number;
  smsAlertsPerMonth: number;
  whatsappAlertsPerMonth: number;
  resultHistoryDays: number; // -1 = unlimited
  cron: ReadonlyArray<'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL' | 'CUSTOM'>;
  /** Source category gates for searches. Empty = all allowed. */
  allowedSourceCategories: ReadonlyArray<'news' | 'social' | 'forums' | 'blogs'>;
  exportFormats: ReadonlyArray<'csv' | 'xlsx' | 'json' | 'pdf'>;
  webhooks: boolean;
  apiAccess: boolean;
  customEmailDomain: boolean;
  scheduledExports: boolean;
  /** Public share links for crawl results — Pro+ only. */
  resultSharing: boolean;
  teamSeats: number; // 1 = solo, 5 = Business default, etc.
  prioritySupport: boolean;
  uptimeSLA: boolean;

  // Marketing-bullet flags. These don't gate runtime behavior today —
  // they exist so the admin can toggle whether the bullet appears on
  // the pricing / billing card. If any of these later need to gate a
  // feature, add the assert in EntitlementsService.
  smartFiltering: boolean;
  keywordGenerator: boolean;
  repeatedWordIdentification: boolean;
  locationSearch: boolean;
  sharedSearches: boolean;
  rbac: boolean;
  emailSupport: boolean;
  communitySupport: boolean;
};

export type PlanDefinition = {
  tier: PlanTier;
  name: string;
  description: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  limits: PlanLimits;
  sortOrder: number;
};

const NEWS_ONLY = ['news'] as const;
const ALL_CATEGORIES = ['news', 'social', 'forums', 'blogs'] as const;

export const PLAN_CATALOG: ReadonlyArray<PlanDefinition> = [
  {
    tier: 'FREE',
    name: 'Free',
    description: 'Try CRWLA with one saved search and a small set of keywords.',
    priceMonthlyCents: 0,
    priceYearlyCents: 0,
    sortOrder: 0,
    limits: {
      savedSearches: 1,
      keywordsPerSearch: 3,
      bulkKeywordImport: 3,
      manualRunsPerMonth: 10,
      scheduledRunsPerSearchPerMonth: 0,
      emailAlerts: 3,
      smsAlertsPerMonth: 0,
      whatsappAlertsPerMonth: 0,
      resultHistoryDays: 7,
      cron: ['MANUAL'],
      allowedSourceCategories: NEWS_ONLY,
      exportFormats: [],
      webhooks: false,
      apiAccess: false,
      customEmailDomain: false,
      scheduledExports: false,
      resultSharing: false,
      teamSeats: 1,
      prioritySupport: false,
      uptimeSLA: false,
      smartFiltering: false,
      keywordGenerator: false,
      repeatedWordIdentification: false,
      locationSearch: false,
      sharedSearches: false,
      rbac: false,
      emailSupport: false,
      communitySupport: true,
    },
  },
  {
    tier: 'STARTER',
    name: 'Student / Starter',
    description: 'For solo researchers — weekly schedules and CSV export.',
    priceMonthlyCents: 500,
    priceYearlyCents: 4800,
    sortOrder: 10,
    limits: {
      savedSearches: 5,
      keywordsPerSearch: 8,
      bulkKeywordImport: 30,
      manualRunsPerMonth: 30,
      scheduledRunsPerSearchPerMonth: 20,
      emailAlerts: 5,
      smsAlertsPerMonth: 0,
      whatsappAlertsPerMonth: 0,
      resultHistoryDays: 14,
      cron: ['WEEKLY', 'MANUAL'],
      allowedSourceCategories: NEWS_ONLY,
      exportFormats: ['csv'],
      webhooks: false,
      apiAccess: false,
      customEmailDomain: false,
      scheduledExports: false,
      resultSharing: false,
      teamSeats: 1,
      prioritySupport: false,
      uptimeSLA: false,
      smartFiltering: true,
      keywordGenerator: false,
      repeatedWordIdentification: false,
      locationSearch: false,
      sharedSearches: false,
      rbac: false,
      emailSupport: false,
      communitySupport: false,
    },
  },
  {
    tier: 'BASIC',
    name: 'Basic',
    description: 'Daily scheduling, all sources, location-based searches.',
    priceMonthlyCents: 1200,
    priceYearlyCents: 12000,
    sortOrder: 20,
    limits: {
      savedSearches: 15,
      keywordsPerSearch: 12,
      bulkKeywordImport: 100,
      manualRunsPerMonth: 100,
      scheduledRunsPerSearchPerMonth: 50,
      emailAlerts: 15,
      smsAlertsPerMonth: 0,
      whatsappAlertsPerMonth: 0,
      resultHistoryDays: 30,
      cron: ['DAILY', 'WEEKLY', 'MANUAL'],
      allowedSourceCategories: ALL_CATEGORIES,
      exportFormats: ['csv', 'xlsx'],
      webhooks: false,
      apiAccess: false,
      customEmailDomain: false,
      scheduledExports: false,
      resultSharing: false,
      teamSeats: 1,
      prioritySupport: false,
      uptimeSLA: false,
      smartFiltering: true,
      keywordGenerator: false,
      repeatedWordIdentification: false,
      locationSearch: true,
      sharedSearches: false,
      rbac: false,
      emailSupport: true,
      communitySupport: false,
    },
  },
  {
    tier: 'PRO',
    name: 'Pro',
    description: 'Custom scheduling, AI keyword generator, webhooks, SMS alerts.',
    priceMonthlyCents: 3500,
    priceYearlyCents: 35000,
    sortOrder: 30,
    limits: {
      savedSearches: 40,
      keywordsPerSearch: 20,
      bulkKeywordImport: 100,
      manualRunsPerMonth: 500,
      scheduledRunsPerSearchPerMonth: 100,
      emailAlerts: 40,
      smsAlertsPerMonth: 50,
      whatsappAlertsPerMonth: 0,
      resultHistoryDays: 90,
      cron: ['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL', 'CUSTOM'],
      allowedSourceCategories: ALL_CATEGORIES,
      exportFormats: ['csv', 'xlsx', 'json', 'pdf'],
      webhooks: true,
      apiAccess: false,
      customEmailDomain: false,
      scheduledExports: false,
      resultSharing: true,
      teamSeats: 1,
      prioritySupport: true,
      uptimeSLA: false,
      smartFiltering: true,
      keywordGenerator: true,
      repeatedWordIdentification: true,
      locationSearch: true,
      sharedSearches: false,
      rbac: false,
      emailSupport: false,
      communitySupport: false,
    },
  },
  {
    tier: 'BUSINESS',
    name: 'Business',
    description:
      'Teams of 5+, shared searches, RBAC, custom email domain, WhatsApp alerts, SLA.',
    priceMonthlyCents: 14900,
    priceYearlyCents: 149000,
    sortOrder: 40,
    limits: {
      savedSearches: 100,
      keywordsPerSearch: 25,
      bulkKeywordImport: 500,
      manualRunsPerMonth: -1,
      scheduledRunsPerSearchPerMonth: -1,
      emailAlerts: -1,
      smsAlertsPerMonth: 300,
      whatsappAlertsPerMonth: 300,
      resultHistoryDays: -1,
      cron: ['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL', 'CUSTOM'],
      allowedSourceCategories: ALL_CATEGORIES,
      exportFormats: ['csv', 'xlsx', 'json', 'pdf'],
      webhooks: true,
      apiAccess: true,
      customEmailDomain: true,
      scheduledExports: true,
      resultSharing: true,
      teamSeats: 5,
      prioritySupport: true,
      uptimeSLA: true,
      smartFiltering: true,
      keywordGenerator: true,
      repeatedWordIdentification: true,
      locationSearch: true,
      sharedSearches: true,
      rbac: true,
      emailSupport: false,
      communitySupport: false,
    },
  },
];

/**
 * Add-on packs. The Polar product ids come from env vars and are matched on
 * webhook receipt.
 */
export const ADDON_CATALOG = {
  EXTRA_RUN_PACK: { priceCents: 500, units: 30, label: '30 manual runs' },
  EXTRA_SMS_PACK: { priceCents: 1000, units: 200, label: '200 SMS' },
  EXTRA_SEAT: { priceCents: 1500, units: null as number | null, label: 'Additional Business seat' },
} as const;

export const FREE_TIER: PlanTier = 'FREE';

export function planByTier(tier: PlanTier): PlanDefinition {
  const p = PLAN_CATALOG.find((p) => p.tier === tier);
  if (!p) throw new Error(`unknown plan tier: ${tier}`);
  return p;
}

// ---------------------------------------------------------------------
// Derived features
//
// Every bullet on a pricing / billing / admin card is computed here from
// `PlanLimits`. There is no separate features table or column — flip a
// flag in `limits`, the bullet appears/disappears everywhere.
//
// Numeric limits emit quantity bullets ("40 saved searches" / "Unlimited
// result history"). Array limits collapse to summary phrases ("All
// sources", "CSV + Excel export"). Boolean flags emit a static string
// when true. Anything excluded is dropped from the output entirely — we
// don't render struck-through rows.
//
// MIRROR: `apps/web/app/(app)/admin/billing/edit-plan-drawer.tsx`
// contains `deriveFeaturesLocal()`, a copy of this function so the
// admin Preview pane stays in sync without an API round-trip. If you
// change the rules here, update that file too (and vice versa).

export type DerivedFeature = {
  /** Stable key — used as the React key on the FE. */
  key: string;
  label: string;
  /** Always true in the returned list (excluded bullets are filtered). */
  included: true;
  sortOrder: number;
};

const CRON_DISPLAY: Record<string, string> = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  CUSTOM: 'custom',
};

function num(n: number): string {
  return n < 0 ? 'Unlimited' : n.toString();
}

function cronBullet(cron: PlanLimits['cron']): string | null {
  // Excludes MANUAL — every plan implicitly supports manual runs.
  const named = cron
    .filter((c) => c !== 'MANUAL')
    .map((c) => CRON_DISPLAY[c])
    .filter(Boolean);
  if (named.length === 0) return null; // manual-only plan: skip the row
  return `${capitalize(named.join(', '))} scheduling`;
}

function sourcesBullet(cats: PlanLimits['allowedSourceCategories']): string | null {
  if (cats.length === 0) return null;
  if (cats.length >= 4) return 'All sources (news, social, forums, blogs)';
  return `Sources: ${cats.join(', ')}`;
}

function exportsBullet(fmts: PlanLimits['exportFormats']): string | null {
  if (fmts.length === 0) return null;
  if (fmts.length >= 4) return 'All export formats';
  return `${fmts.map((f) => f.toUpperCase()).join(' + ')} export`;
}

function alertsBullet(limits: PlanLimits): string | null {
  const parts: string[] = [];
  if (limits.emailAlerts !== 0) parts.push(`${num(limits.emailAlerts)} email`);
  if (limits.smsAlertsPerMonth > 0) parts.push(`${limits.smsAlertsPerMonth} SMS`);
  if (limits.whatsappAlertsPerMonth > 0) {
    parts.push(`${limits.whatsappAlertsPerMonth} WhatsApp`);
  }
  if (parts.length === 0) return null;
  return `${parts.join(' + ')} alerts`;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/**
 * Compute the ordered list of feature bullets for a plan. Pass in
 * `limits` (the FREE-tier defaults are used if any field is missing).
 */
export function deriveFeatures(limits: PlanLimits): DerivedFeature[] {
  const out: DerivedFeature[] = [];
  let order = 0;
  const push = (key: string, label: string | null) => {
    if (label) {
      out.push({ key, label, included: true, sortOrder: order++ });
    }
  };

  // --- Quantitative limits ---
  push(
    'savedSearches',
    limits.savedSearches === 0
      ? null
      : `${num(limits.savedSearches)} saved ${limits.savedSearches === 1 ? 'search' : 'searches'}`,
  );
  push(
    'keywordsPerSearch',
    limits.keywordsPerSearch === 0
      ? null
      : `${num(limits.keywordsPerSearch)} keywords per search`,
  );
  push('cron', cronBullet(limits.cron));
  push(
    'scheduledRunsPerSearchPerMonth',
    limits.scheduledRunsPerSearchPerMonth === 0
      ? null
      : limits.scheduledRunsPerSearchPerMonth < 0
        ? 'Unlimited scheduled runs'
        : `${limits.scheduledRunsPerSearchPerMonth} scheduled runs / search / month`,
  );
  push(
    'manualRunsPerMonth',
    limits.manualRunsPerMonth === 0
      ? null
      : limits.manualRunsPerMonth < 0
        ? 'Unlimited manual runs'
        : `${limits.manualRunsPerMonth} manual runs / month`,
  );
  push('alerts', alertsBullet(limits));
  push(
    'bulkKeywordImport',
    limits.bulkKeywordImport > 0
      ? `Bulk keyword input (${limits.bulkKeywordImport} at once)`
      : null,
  );
  push('allowedSourceCategories', sourcesBullet(limits.allowedSourceCategories));
  push(
    'resultHistoryDays',
    limits.resultHistoryDays === 0
      ? null
      : limits.resultHistoryDays < 0
        ? 'Unlimited result history'
        : `${limits.resultHistoryDays}-day result history`,
  );
  push('exportFormats', exportsBullet(limits.exportFormats));
  push(
    'teamSeats',
    limits.teamSeats > 1 ? `Up to ${limits.teamSeats} team members` : null,
  );

  // --- Boolean feature flags ---
  push('locationSearch', limits.locationSearch ? 'Location-based searches' : null);
  push('smartFiltering', limits.smartFiltering ? 'Smart filtering & duplicate detection' : null);
  push('keywordGenerator', limits.keywordGenerator ? 'Keyword generator (AI-suggested)' : null);
  push('repeatedWordIdentification', limits.repeatedWordIdentification ? 'Repeated word identification' : null);
  push('sharedSearches', limits.sharedSearches ? 'Shared searches & alerts' : null);
  push('rbac', limits.rbac ? 'Role-based permissions' : null);
  push('customEmailDomain', limits.customEmailDomain ? 'Custom email domain for alerts' : null);
  push('webhooks', limits.webhooks ? 'Webhooks (Slack, Zapier, custom URLs)' : null);
  push('apiAccess', limits.apiAccess ? 'API access' : null);
  push('scheduledExports', limits.scheduledExports ? 'Scheduled exports' : null);
  push('resultSharing', limits.resultSharing ? 'Public result sharing (/p/<slug>)' : null);
  push(
    'support',
    limits.prioritySupport
      ? 'Priority email support'
      : limits.emailSupport
        ? 'Email support'
        : limits.communitySupport
          ? 'Community support'
          : null,
  );
  push('uptimeSLA', limits.uptimeSLA ? '99.9% uptime SLA' : null);

  return out;
}
