-- ScheduledPlanChange: pending downgrades applied at period end.
--
-- BillingService writes a row instead of mutating Subscription immediately
-- when a user requests a downgrade; a BullMQ repeatable worker walks the
-- table on a 15-minute tick, applies expired PENDING rows, and marks them
-- APPLIED. See apps/api/src/modules/billing/billing.service.ts.

-- ScheduledPlanChangeStatus enum (Postgres has no `CREATE TYPE IF NOT EXISTS`)
DO $$ BEGIN
  CREATE TYPE "ScheduledPlanChangeStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ScheduledPlanChange" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "currentPlanId"  TEXT NOT NULL,
  "targetPlanId"   TEXT NOT NULL,
  "targetInterval" "BillingInterval" NOT NULL DEFAULT 'MONTH',
  "scheduledFor"   TIMESTAMP(3) NOT NULL,
  "status"         "ScheduledPlanChangeStatus" NOT NULL DEFAULT 'PENDING',
  "appliedAt"      TIMESTAMP(3),
  "canceledAt"     TIMESTAMP(3),
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduledPlanChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScheduledPlanChange_status_scheduledFor_idx"
  ON "ScheduledPlanChange"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "ScheduledPlanChange_userId_status_idx"
  ON "ScheduledPlanChange"("userId", "status");

ALTER TABLE "ScheduledPlanChange"
  ADD CONSTRAINT "ScheduledPlanChange_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPlanChange"
  ADD CONSTRAINT "ScheduledPlanChange_currentPlanId_fkey"
  FOREIGN KEY ("currentPlanId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledPlanChange"
  ADD CONSTRAINT "ScheduledPlanChange_targetPlanId_fkey"
  FOREIGN KEY ("targetPlanId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
