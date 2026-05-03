// Queue-name constants live in their own leaf file so queues.module.ts and
// the individual queue/processor files can both import them without
// creating a TS-level circular import (which Nest surfaces as a "circular
// dependency detected" error at scan time).
export const SCRAPE_QUEUE = 'scrape';
export const SEARCH_INDEX_QUEUE = 'search-index';
