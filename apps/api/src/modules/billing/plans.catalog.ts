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
};

export type PlanDefinition = {
  tier: PlanTier;
  name: string;
  description: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  /** Marketing-style bullet list shown on the pricing page. */
  features: ReadonlyArray<string>;
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
    features: [
      '1 saved search',
      '3 keywords per search',
      '10 manual runs / month',
      '3 email alerts',
      'Core search engines',
      '7-day result history',
      'Community support',
    ],
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
    },
  },
  {
    tier: 'STARTER',
    name: 'Student / Starter',
    description: 'For solo researchers — weekly schedules and CSV export.',
    priceMonthlyCents: 500,
    priceYearlyCents: 4800,
    sortOrder: 10,
    features: [
      '5 saved searches',
      '8 keywords per search',
      'Weekly & monthly scheduling',
      '20 scheduled runs per search / month',
      '5 email alerts',
      'Bulk keyword input (30 at once)',
      'Smart filtering & duplicate detection',
      '14-day result history',
      'CSV export',
    ],
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
    },
  },
  {
    tier: 'BASIC',
    name: 'Basic',
    description: 'Daily scheduling, all sources, location-based searches.',
    priceMonthlyCents: 1200,
    priceYearlyCents: 12000,
    sortOrder: 20,
    features: [
      '15 saved searches',
      '12 keywords per search',
      'Daily, weekly, monthly scheduling',
      '50 scheduled runs per search / month',
      '15 email alerts',
      'All sources (search engines, social, blogs)',
      'Bulk keyword input (100 at once)',
      'Location-based searches',
      '30-day result history',
      'CSV + Excel export',
      'Email support',
    ],
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
    },
  },
  {
    tier: 'PRO',
    name: 'Pro',
    description: 'Custom scheduling, AI keyword generator, webhooks, SMS alerts.',
    priceMonthlyCents: 3500,
    priceYearlyCents: 35000,
    sortOrder: 30,
    features: [
      '40 saved searches',
      '20 keywords per search',
      'Daily, weekly, monthly + custom scheduling',
      '100 scheduled runs per search / month',
      '40 alerts (email + SMS, 50 SMS / month)',
      'Keyword generator (AI-suggested)',
      'Repeated word identification',
      '90-day result history',
      'All export formats',
      'Webhooks (Slack, Zapier, custom URLs)',
      'Priority email support',
    ],
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
    features: [
      'Everything in Pro',
      '100 saved searches',
      '25 keywords per search',
      'Up to 5 team members (then $15/seat/month)',
      'Shared searches & alerts',
      'Role-based permissions',
      'Custom email domain for alerts',
      'WhatsApp alerts (300 SMS+WhatsApp combined / month)',
      'Unlimited scheduled runs',
      'Unlimited result history',
      'Scheduled exports',
      'Webhooks + early API access (coming soon)',
      'Priority chat + email support',
      '99.9% uptime SLA',
    ],
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
