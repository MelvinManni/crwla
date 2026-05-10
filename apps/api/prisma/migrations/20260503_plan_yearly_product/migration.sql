-- Add Plan.polarProductMonthlyId + polarProductYearlyId
-- Polar tags one `recurring_interval` per product, so each plan that offers
-- both monthly and yearly billing needs two products. `polarProductId` is
-- kept for backwards compat (aliased to the monthly product).

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "polarProductMonthlyId" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "polarProductYearlyId"  TEXT;

-- Backfill: copy any existing single-product id into the monthly slot.
UPDATE "Plan" SET "polarProductMonthlyId" = "polarProductId"
WHERE "polarProductMonthlyId" IS NULL AND "polarProductId" IS NOT NULL;
