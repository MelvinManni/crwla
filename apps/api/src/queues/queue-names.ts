// Queue-name constants live in their own leaf file so queues.module.ts and
// the individual queue/processor files can both import them without
// creating a TS-level circular import (which Nest surfaces as a "circular
// dependency detected" error at scan time).
export const SCRAPE_QUEUE = 'scrape';
export const SEARCH_INDEX_QUEUE = 'search-index';
export const SCHEDULED_PLAN_CHANGES_QUEUE = 'scheduled-plan-changes';
export const PRICING_CRAWLA_QUEUE = 'pricing-crawla';
export const JOB_SEARCH_QUEUE = 'job-search';
export const COMPANY_SYNC_QUEUE = 'company-sync';
