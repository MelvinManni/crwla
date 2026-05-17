-- The `resultSharing` flag was added to PlanLimits when public crawl
-- sharing shipped, but DBs seeded before that point are missing the
-- key entirely — and the entitlement check defaults absent-key to
-- `false`. Result: a paying Business customer hits the "upgrade to
-- Pro" modal when trying to share a crawl.
--
-- The earlier 20260517_plan_feature_consolidate migration backfilled
-- the 8 marketing-bullet flags but not `resultSharing`. This migration
-- closes that gap.
--
-- Strategy: set the flag based on the canonical per-tier default. Use
-- `||` to preserve any other fields. For paid tiers, force the value
-- to match the catalog so a missing-key row gets corrected; for free
-- tiers, only add when absent so an admin who explicitly opted into
-- sharing on a non-paid tier isn't overridden.

UPDATE "plan"
SET "limits" = "limits"::jsonb || '{"resultSharing": true}'::jsonb
WHERE "tier" IN ('PRO', 'BUSINESS');

UPDATE "plan"
SET "limits" = "limits"::jsonb || '{"resultSharing": false}'::jsonb
WHERE "tier" IN ('FREE', 'STARTER', 'BASIC')
  AND NOT ("limits"::jsonb ? 'resultSharing');
