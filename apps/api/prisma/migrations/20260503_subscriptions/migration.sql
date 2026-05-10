-- CRWLA — billing schema. Plan / Subscription / UsageMeter / AddOn.
-- See `apps/api/src/modules/billing/plans.catalog.ts` for plan definitions
-- (seeded into the Plan table on each app boot).

CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'BASIC', 'PRO', 'BUSINESS');
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID');
CREATE TYPE "AddOnKind" AS ENUM ('EXTRA_RUN_PACK', 'EXTRA_SMS_PACK', 'EXTRA_SEAT');

CREATE TABLE "Plan" (
  "id"                  TEXT NOT NULL,
  "tier"                "PlanTier" NOT NULL,
  "name"                TEXT NOT NULL,
  "description"         TEXT,
  "priceMonthlyCents"   INTEGER NOT NULL DEFAULT 0,
  "priceYearlyCents"    INTEGER NOT NULL DEFAULT 0,
  "polarProductId"      TEXT,
  "polarPriceMonthlyId" TEXT,
  "polarPriceYearlyId"  TEXT,
  "limits"              JSONB NOT NULL,
  "features"            JSONB NOT NULL DEFAULT '[]',
  "active"              BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"           INTEGER NOT NULL DEFAULT 0,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");

CREATE TABLE "Subscription" (
  "id"                   TEXT NOT NULL,
  "userId"               TEXT NOT NULL,
  "planId"               TEXT NOT NULL,
  "status"               "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "interval"             "BillingInterval" NOT NULL DEFAULT 'MONTH',
  "currentPeriodStart"   TIMESTAMP(3),
  "currentPeriodEnd"     TIMESTAMP(3),
  "cancelAtPeriodEnd"    BOOLEAN NOT NULL DEFAULT false,
  "canceledAt"           TIMESTAMP(3),
  "polarSubscriptionId"  TEXT,
  "polarCustomerId"      TEXT,
  "polarCheckoutId"      TEXT,
  "seats"                INTEGER NOT NULL DEFAULT 1,
  "metadata"             JSONB,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE UNIQUE INDEX "Subscription_polarSubscriptionId_key" ON "Subscription"("polarSubscriptionId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_polarCustomerId_idx" ON "Subscription"("polarCustomerId");

CREATE TABLE "UsageMeter" (
  "id"              TEXT NOT NULL,
  "subscriptionId"  TEXT NOT NULL,
  "period"          TEXT NOT NULL,
  "periodStart"     TIMESTAMP(3) NOT NULL,
  "periodEnd"       TIMESTAMP(3) NOT NULL,
  "manualRuns"      INTEGER NOT NULL DEFAULT 0,
  "scheduledRuns"   INTEGER NOT NULL DEFAULT 0,
  "emailAlerts"     INTEGER NOT NULL DEFAULT 0,
  "smsAlerts"       INTEGER NOT NULL DEFAULT 0,
  "whatsappAlerts"  INTEGER NOT NULL DEFAULT 0,
  "csvExports"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageMeter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UsageMeter_subscriptionId_period_key" ON "UsageMeter"("subscriptionId", "period");
CREATE INDEX "UsageMeter_subscriptionId_periodEnd_idx" ON "UsageMeter"("subscriptionId", "periodEnd");

CREATE TABLE "AddOn" (
  "id"                  TEXT NOT NULL,
  "subscriptionId"      TEXT NOT NULL,
  "kind"                "AddOnKind" NOT NULL,
  "quantity"            INTEGER NOT NULL DEFAULT 1,
  "unitsRemaining"      INTEGER,
  "polarOrderId"        TEXT,
  "polarSubscriptionId" TEXT,
  "purchasedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"           TIMESTAMP(3),
  CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AddOn_polarOrderId_key" ON "AddOn"("polarOrderId");
CREATE INDEX "AddOn_subscriptionId_kind_idx" ON "AddOn"("subscriptionId", "kind");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageMeter" ADD CONSTRAINT "UsageMeter_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
