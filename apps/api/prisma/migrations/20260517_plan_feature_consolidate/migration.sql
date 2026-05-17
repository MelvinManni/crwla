-- Consolidate plan features into Plan.limits.
--
-- The earlier `20260517_plan_feature_table` migration normalized features
-- into a separate table. Maintaining that table alongside `Plan.limits`
-- meant editing the same idea in two places — exactly the invariant we
-- wanted to avoid. Going forward, every visible feature bullet is derived
-- from a flag or numeric limit in `Plan.limits`, so the admin only edits
-- one thing.
--
-- This migration:
--   1. Drops the `plan_feature` table.
--   2. Drops the legacy `plan.features` JSON column.
--   3. Backfills 8 new boolean flags on existing plan rows so the
--      previously-marketing-only bullets (community support, smart
--      filtering, etc.) keep showing up.
--
-- All three steps are IF EXISTS / additive-JSON, so this is safe in
-- every applied state: dev DBs that ran the prior migration, dev DBs
-- that didn't, and fresh prod DBs that will run both in sequence.

-- 1. Drop the normalized table -----------------------------------------
DROP TABLE IF EXISTS "plan_feature" CASCADE;

-- 2. Drop the legacy JSON column ---------------------------------------
ALTER TABLE "plan" DROP COLUMN IF EXISTS "features";

-- 3. Backfill the new feature flags ------------------------------------
-- `||` merges JSONB objects (right-overrides-left). Since these keys
-- weren't in `limits` before, no existing field gets clobbered. If an
-- admin had already manually added one of these keys to a plan, this
-- update DOES overwrite it — that's intentional, the tier-level default
-- is the source of truth for fresh installs anyway.

UPDATE "plan"
SET "limits" = "limits"::jsonb || '{
  "smartFiltering": false,
  "keywordGenerator": false,
  "repeatedWordIdentification": false,
  "locationSearch": false,
  "sharedSearches": false,
  "rbac": false,
  "emailSupport": false,
  "communitySupport": true
}'::jsonb
WHERE "tier" = 'FREE';

UPDATE "plan"
SET "limits" = "limits"::jsonb || '{
  "smartFiltering": true,
  "keywordGenerator": false,
  "repeatedWordIdentification": false,
  "locationSearch": false,
  "sharedSearches": false,
  "rbac": false,
  "emailSupport": false,
  "communitySupport": false
}'::jsonb
WHERE "tier" = 'STARTER';

UPDATE "plan"
SET "limits" = "limits"::jsonb || '{
  "smartFiltering": true,
  "keywordGenerator": false,
  "repeatedWordIdentification": false,
  "locationSearch": true,
  "sharedSearches": false,
  "rbac": false,
  "emailSupport": true,
  "communitySupport": false
}'::jsonb
WHERE "tier" = 'BASIC';

UPDATE "plan"
SET "limits" = "limits"::jsonb || '{
  "smartFiltering": true,
  "keywordGenerator": true,
  "repeatedWordIdentification": true,
  "locationSearch": true,
  "sharedSearches": false,
  "rbac": false,
  "emailSupport": false,
  "communitySupport": false
}'::jsonb
WHERE "tier" = 'PRO';

UPDATE "plan"
SET "limits" = "limits"::jsonb || '{
  "smartFiltering": true,
  "keywordGenerator": true,
  "repeatedWordIdentification": true,
  "locationSearch": true,
  "sharedSearches": true,
  "rbac": true,
  "emailSupport": false,
  "communitySupport": false
}'::jsonb
WHERE "tier" = 'BUSINESS';
