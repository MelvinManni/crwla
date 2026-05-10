-- Rename all PascalCase / camelCase tables, columns, indexes and FK
-- constraints to snake_case so the DB matches Prisma's @@map / @map.
-- Pure renames preserve data; PG updates FK targets transparently.

-- ============================================================
-- Tables
-- ============================================================
ALTER TABLE "User"                RENAME TO "user";
ALTER TABLE "AccessRequest"       RENAME TO "access_request";
ALTER TABLE "Search"              RENAME TO "search";
ALTER TABLE "Run"                 RENAME TO "run";
ALTER TABLE "Result"              RENAME TO "result";
ALTER TABLE "Alert"               RENAME TO "alert";
ALTER TABLE "Plan"                RENAME TO "plan";
ALTER TABLE "Subscription"        RENAME TO "subscription";
ALTER TABLE "UsageMeter"          RENAME TO "usage_meter";
ALTER TABLE "AddOn"               RENAME TO "add_on";
ALTER TABLE "ScheduledPlanChange" RENAME TO "scheduled_plan_change";

-- ============================================================
-- Columns
-- ============================================================

-- user
ALTER TABLE "user" RENAME COLUMN "passwordHash"             TO "password_hash";
ALTER TABLE "user" RENAME COLUMN "lastActiveAt"             TO "last_active_at";
ALTER TABLE "user" RENAME COLUMN "createdAt"                TO "created_at";
ALTER TABLE "user" RENAME COLUMN "updatedAt"                TO "updated_at";
ALTER TABLE "user" RENAME COLUMN "disabledSourceCategories" TO "disabled_source_categories";

-- access_request
ALTER TABLE "access_request" RENAME COLUMN "passwordHash" TO "password_hash";
ALTER TABLE "access_request" RENAME COLUMN "createdAt"    TO "created_at";

-- search
ALTER TABLE "search" RENAME COLUMN "userId"       TO "user_id";
ALTER TABLE "search" RENAME COLUMN "filterPrompt" TO "filter_prompt";
ALTER TABLE "search" RENAME COLUMN "lastRunAt"    TO "last_run_at";
ALTER TABLE "search" RENAME COLUMN "nextRunAt"    TO "next_run_at";
ALTER TABLE "search" RENAME COLUMN "lastError"    TO "last_error";
ALTER TABLE "search" RENAME COLUMN "createdAt"    TO "created_at";
ALTER TABLE "search" RENAME COLUMN "updatedAt"    TO "updated_at";

-- run
ALTER TABLE "run" RENAME COLUMN "searchId"     TO "search_id";
ALTER TABLE "run" RENAME COLUMN "startedAt"    TO "started_at";
ALTER TABLE "run" RENAME COLUMN "finishedAt"   TO "finished_at";
ALTER TABLE "run" RENAME COLUMN "resultsCount" TO "results_count";
ALTER TABLE "run" RENAME COLUMN "durationMs"   TO "duration_ms";

-- result
ALTER TABLE "result" RENAME COLUMN "searchId"     TO "search_id";
ALTER TABLE "result" RENAME COLUMN "runId"        TO "run_id";
ALTER TABLE "result" RENAME COLUMN "urlHash"      TO "url_hash";
ALTER TABLE "result" RENAME COLUMN "imageUrl"     TO "image_url";
ALTER TABLE "result" RENAME COLUMN "publishedAt"  TO "published_at";
ALTER TABLE "result" RENAME COLUMN "fetchedAt"    TO "fetched_at";
ALTER TABLE "result" RENAME COLUMN "searchVector" TO "search_vector";

-- alert
ALTER TABLE "alert" RENAME COLUMN "userId"        TO "user_id";
ALTER TABLE "alert" RENAME COLUMN "searchId"      TO "search_id";
ALTER TABLE "alert" RENAME COLUMN "lastTriggered" TO "last_triggered";
ALTER TABLE "alert" RENAME COLUMN "createdAt"     TO "created_at";

-- plan
ALTER TABLE "plan" RENAME COLUMN "priceMonthlyCents"     TO "price_monthly_cents";
ALTER TABLE "plan" RENAME COLUMN "priceYearlyCents"      TO "price_yearly_cents";
ALTER TABLE "plan" RENAME COLUMN "polarProductId"        TO "polar_product_id";
ALTER TABLE "plan" RENAME COLUMN "polarProductMonthlyId" TO "polar_product_monthly_id";
ALTER TABLE "plan" RENAME COLUMN "polarProductYearlyId"  TO "polar_product_yearly_id";
ALTER TABLE "plan" RENAME COLUMN "polarPriceMonthlyId"   TO "polar_price_monthly_id";
ALTER TABLE "plan" RENAME COLUMN "polarPriceYearlyId"    TO "polar_price_yearly_id";
ALTER TABLE "plan" RENAME COLUMN "sortOrder"             TO "sort_order";
ALTER TABLE "plan" RENAME COLUMN "createdAt"             TO "created_at";
ALTER TABLE "plan" RENAME COLUMN "updatedAt"             TO "updated_at";

-- subscription
ALTER TABLE "subscription" RENAME COLUMN "userId"              TO "user_id";
ALTER TABLE "subscription" RENAME COLUMN "planId"              TO "plan_id";
ALTER TABLE "subscription" RENAME COLUMN "currentPeriodStart"  TO "current_period_start";
ALTER TABLE "subscription" RENAME COLUMN "currentPeriodEnd"    TO "current_period_end";
ALTER TABLE "subscription" RENAME COLUMN "cancelAtPeriodEnd"   TO "cancel_at_period_end";
ALTER TABLE "subscription" RENAME COLUMN "canceledAt"          TO "canceled_at";
ALTER TABLE "subscription" RENAME COLUMN "polarSubscriptionId" TO "polar_subscription_id";
ALTER TABLE "subscription" RENAME COLUMN "polarCustomerId"     TO "polar_customer_id";
ALTER TABLE "subscription" RENAME COLUMN "polarCheckoutId"     TO "polar_checkout_id";
ALTER TABLE "subscription" RENAME COLUMN "createdAt"           TO "created_at";
ALTER TABLE "subscription" RENAME COLUMN "updatedAt"           TO "updated_at";

-- usage_meter
ALTER TABLE "usage_meter" RENAME COLUMN "subscriptionId" TO "subscription_id";
ALTER TABLE "usage_meter" RENAME COLUMN "periodStart"    TO "period_start";
ALTER TABLE "usage_meter" RENAME COLUMN "periodEnd"      TO "period_end";
ALTER TABLE "usage_meter" RENAME COLUMN "manualRuns"     TO "manual_runs";
ALTER TABLE "usage_meter" RENAME COLUMN "scheduledRuns"  TO "scheduled_runs";
ALTER TABLE "usage_meter" RENAME COLUMN "emailAlerts"    TO "email_alerts";
ALTER TABLE "usage_meter" RENAME COLUMN "smsAlerts"      TO "sms_alerts";
ALTER TABLE "usage_meter" RENAME COLUMN "whatsappAlerts" TO "whatsapp_alerts";
ALTER TABLE "usage_meter" RENAME COLUMN "csvExports"     TO "csv_exports";
ALTER TABLE "usage_meter" RENAME COLUMN "createdAt"      TO "created_at";
ALTER TABLE "usage_meter" RENAME COLUMN "updatedAt"      TO "updated_at";

-- add_on
ALTER TABLE "add_on" RENAME COLUMN "subscriptionId"      TO "subscription_id";
ALTER TABLE "add_on" RENAME COLUMN "unitsRemaining"      TO "units_remaining";
ALTER TABLE "add_on" RENAME COLUMN "polarOrderId"        TO "polar_order_id";
ALTER TABLE "add_on" RENAME COLUMN "polarSubscriptionId" TO "polar_subscription_id";
ALTER TABLE "add_on" RENAME COLUMN "purchasedAt"         TO "purchased_at";
ALTER TABLE "add_on" RENAME COLUMN "expiresAt"           TO "expires_at";

-- scheduled_plan_change
ALTER TABLE "scheduled_plan_change" RENAME COLUMN "userId"         TO "user_id";
ALTER TABLE "scheduled_plan_change" RENAME COLUMN "currentPlanId"  TO "current_plan_id";
ALTER TABLE "scheduled_plan_change" RENAME COLUMN "targetPlanId"   TO "target_plan_id";
ALTER TABLE "scheduled_plan_change" RENAME COLUMN "targetInterval" TO "target_interval";
ALTER TABLE "scheduled_plan_change" RENAME COLUMN "scheduledFor"   TO "scheduled_for";
ALTER TABLE "scheduled_plan_change" RENAME COLUMN "appliedAt"      TO "applied_at";
ALTER TABLE "scheduled_plan_change" RENAME COLUMN "canceledAt"     TO "canceled_at";
ALTER TABLE "scheduled_plan_change" RENAME COLUMN "createdAt"      TO "created_at";
ALTER TABLE "scheduled_plan_change" RENAME COLUMN "updatedAt"      TO "updated_at";

-- ============================================================
-- Indexes (PK + unique + plain). Match Prisma's expected names.
-- ============================================================

ALTER INDEX "User_pkey"                                  RENAME TO "user_pkey";
ALTER INDEX "User_email_key"                             RENAME TO "user_email_key";

ALTER INDEX "AccessRequest_pkey"                         RENAME TO "access_request_pkey";
ALTER INDEX "AccessRequest_status_createdAt_idx"         RENAME TO "access_request_status_created_at_idx";

ALTER INDEX "Search_pkey"                                RENAME TO "search_pkey";
ALTER INDEX "Search_userId_createdAt_idx"                RENAME TO "search_user_id_created_at_idx";

ALTER INDEX "Run_pkey"                                   RENAME TO "run_pkey";
ALTER INDEX "Run_searchId_startedAt_idx"                 RENAME TO "run_search_id_started_at_idx";

ALTER INDEX "Result_pkey"                                RENAME TO "result_pkey";
ALTER INDEX "Result_searchId_urlHash_key"                RENAME TO "result_search_id_url_hash_key";
ALTER INDEX "Result_searchId_fetchedAt_idx"              RENAME TO "result_search_id_fetched_at_idx";
ALTER INDEX "Result_source_idx"                          RENAME TO "result_source_idx";
ALTER INDEX "Result_location_idx"                        RENAME TO "result_location_idx";

ALTER INDEX "Alert_pkey"                                 RENAME TO "alert_pkey";
ALTER INDEX "Alert_userId_active_idx"                    RENAME TO "alert_user_id_active_idx";

ALTER INDEX "Plan_pkey"                                  RENAME TO "plan_pkey";
ALTER INDEX "Plan_tier_key"                              RENAME TO "plan_tier_key";

ALTER INDEX "Subscription_pkey"                          RENAME TO "subscription_pkey";
ALTER INDEX "Subscription_userId_key"                    RENAME TO "subscription_user_id_key";
ALTER INDEX "Subscription_polarSubscriptionId_key"       RENAME TO "subscription_polar_subscription_id_key";
ALTER INDEX "Subscription_status_idx"                    RENAME TO "subscription_status_idx";
ALTER INDEX "Subscription_polarCustomerId_idx"           RENAME TO "subscription_polar_customer_id_idx";

ALTER INDEX "UsageMeter_pkey"                            RENAME TO "usage_meter_pkey";
ALTER INDEX "UsageMeter_subscriptionId_period_key"       RENAME TO "usage_meter_subscription_id_period_key";
ALTER INDEX "UsageMeter_subscriptionId_periodEnd_idx"    RENAME TO "usage_meter_subscription_id_period_end_idx";

ALTER INDEX "AddOn_pkey"                                 RENAME TO "add_on_pkey";
ALTER INDEX "AddOn_polarOrderId_key"                     RENAME TO "add_on_polar_order_id_key";
ALTER INDEX "AddOn_subscriptionId_kind_idx"              RENAME TO "add_on_subscription_id_kind_idx";

ALTER INDEX "ScheduledPlanChange_pkey"                   RENAME TO "scheduled_plan_change_pkey";
ALTER INDEX "ScheduledPlanChange_status_scheduledFor_idx" RENAME TO "scheduled_plan_change_status_scheduled_for_idx";
ALTER INDEX "ScheduledPlanChange_userId_status_idx"      RENAME TO "scheduled_plan_change_user_id_status_idx";

-- ============================================================
-- Foreign-key constraints. Match Prisma's expected naming.
-- ============================================================

ALTER TABLE "search"                RENAME CONSTRAINT "Search_userId_fkey"                    TO "search_user_id_fkey";
ALTER TABLE "run"                   RENAME CONSTRAINT "Run_searchId_fkey"                     TO "run_search_id_fkey";
ALTER TABLE "result"                RENAME CONSTRAINT "Result_searchId_fkey"                  TO "result_search_id_fkey";
ALTER TABLE "result"                RENAME CONSTRAINT "Result_runId_fkey"                     TO "result_run_id_fkey";
ALTER TABLE "alert"                 RENAME CONSTRAINT "Alert_userId_fkey"                     TO "alert_user_id_fkey";
ALTER TABLE "alert"                 RENAME CONSTRAINT "Alert_searchId_fkey"                   TO "alert_search_id_fkey";
ALTER TABLE "subscription"          RENAME CONSTRAINT "Subscription_userId_fkey"              TO "subscription_user_id_fkey";
ALTER TABLE "subscription"          RENAME CONSTRAINT "Subscription_planId_fkey"              TO "subscription_plan_id_fkey";
ALTER TABLE "usage_meter"           RENAME CONSTRAINT "UsageMeter_subscriptionId_fkey"        TO "usage_meter_subscription_id_fkey";
ALTER TABLE "add_on"                RENAME CONSTRAINT "AddOn_subscriptionId_fkey"             TO "add_on_subscription_id_fkey";
ALTER TABLE "scheduled_plan_change" RENAME CONSTRAINT "ScheduledPlanChange_userId_fkey"       TO "scheduled_plan_change_user_id_fkey";
ALTER TABLE "scheduled_plan_change" RENAME CONSTRAINT "ScheduledPlanChange_currentPlanId_fkey" TO "scheduled_plan_change_current_plan_id_fkey";
ALTER TABLE "scheduled_plan_change" RENAME CONSTRAINT "ScheduledPlanChange_targetPlanId_fkey"  TO "scheduled_plan_change_target_plan_id_fkey";
