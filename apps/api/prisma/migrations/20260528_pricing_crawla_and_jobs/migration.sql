-- Adds two new feature areas: Pricing Crawla (price intelligence) and
-- Job Search (career-page crawler). Both gated to STARTER+ by the
-- entitlements layer; the DB just stores the data.
--
-- Also bumps `usage_meter` with two per-period counters so the
-- consume*Search methods on EntitlementsService can throttle usage.

-- Enums --------------------------------------------------------------
CREATE TYPE "PricingSearchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'ERROR');
CREATE TYPE "JobSearchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'ERROR');
CREATE TYPE "TrackedCompanyStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');

-- Usage meter additions ----------------------------------------------
ALTER TABLE "usage_meter"
  ADD COLUMN "pricing_crawla_searches" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "job_searches" INTEGER NOT NULL DEFAULT 0;

-- Pricing Crawla -----------------------------------------------------
CREATE TABLE "pricing_search" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "country" TEXT,
  "category" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "max_price_usd" INTEGER,
  "status" "PricingSearchStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "alternatives" JSONB,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pricing_search_user_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "pricing_search_user_created" ON "pricing_search"("user_id", "created_at" DESC);
CREATE INDEX "pricing_search_status" ON "pricing_search"("status");

CREATE TABLE "pricing_result" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "search_id" TEXT NOT NULL,
  "store_name" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "price_usd" DOUBLE PRECISION NOT NULL,
  "price_native" DOUBLE PRECISION,
  "currency_native" TEXT,
  "url" TEXT NOT NULL,
  "image_url" TEXT,
  "youtube_url" TEXT,
  "review_summary" TEXT,
  "rating" DOUBLE PRECISION,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rank_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "intent_match" TEXT NOT NULL DEFAULT 'match',
  "intent_reason" TEXT,
  "percentile" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deal_badge" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pricing_result_search_fk" FOREIGN KEY ("search_id") REFERENCES "pricing_search"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "pricing_result_search_rank" ON "pricing_result"("search_id", "rank_score");
CREATE INDEX "pricing_result_search_price" ON "pricing_result"("search_id", "price_usd");

CREATE TABLE "pricing_review" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "result_id" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "rating" DOUBLE PRECISION NOT NULL,
  "body" TEXT NOT NULL,
  "posted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pricing_review_result_fk" FOREIGN KEY ("result_id") REFERENCES "pricing_result"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "pricing_review_result_created" ON "pricing_review"("result_id", "created_at" DESC);

-- Job Search ---------------------------------------------------------
CREATE TABLE "tracked_company" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "career_url" TEXT NOT NULL,
  "selector" TEXT,
  "crawl_interval_min" INTEGER NOT NULL DEFAULT 15,
  "status" "TrackedCompanyStatus" NOT NULL DEFAULT 'ACTIVE',
  "last_crawled" TIMESTAMP(3),
  "last_error" TEXT,
  "job_count" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "tracked_company_name_key" ON "tracked_company"("name");
CREATE INDEX "tracked_company_status" ON "tracked_company"("status");

CREATE TABLE "job_search" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "country" TEXT,
  "remote" BOOLEAN NOT NULL DEFAULT false,
  "status" "JobSearchStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_search_user_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "job_search_user_created" ON "job_search"("user_id", "created_at" DESC);
CREATE INDEX "job_search_status" ON "job_search"("status");

CREATE TABLE "job_result" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "search_id" TEXT NOT NULL,
  "company_id" TEXT,
  "company_name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "location" TEXT,
  "remote" BOOLEAN NOT NULL DEFAULT false,
  "salary_min" INTEGER,
  "salary_max" INTEGER,
  "currency" TEXT,
  "salary_period" TEXT,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "relevance_score" INTEGER NOT NULL DEFAULT 0,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "posted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_result_search_fk" FOREIGN KEY ("search_id") REFERENCES "job_search"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_result_company_fk" FOREIGN KEY ("company_id") REFERENCES "tracked_company"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "job_result_search_relevance" ON "job_result"("search_id", "relevance_score" DESC);
CREATE INDEX "job_result_company" ON "job_result"("company_id");

-- Backfill the new feature flags on existing plan rows -----------------
-- FREE: locked (matches catalog defaults). STARTER+: unlocked with caps.
UPDATE "plan" SET "limits" = "limits"::jsonb || '{
  "pricingCrawla": false,
  "jobSearch": false,
  "pricingCrawlaSearchesPerMonth": 0,
  "jobSearchesPerMonth": 0
}'::jsonb WHERE "tier" = 'FREE';

UPDATE "plan" SET "limits" = "limits"::jsonb || '{
  "pricingCrawla": true,
  "jobSearch": true,
  "pricingCrawlaSearchesPerMonth": 25,
  "jobSearchesPerMonth": 25
}'::jsonb WHERE "tier" = 'STARTER';

UPDATE "plan" SET "limits" = "limits"::jsonb || '{
  "pricingCrawla": true,
  "jobSearch": true,
  "pricingCrawlaSearchesPerMonth": 100,
  "jobSearchesPerMonth": 100
}'::jsonb WHERE "tier" = 'BASIC';

UPDATE "plan" SET "limits" = "limits"::jsonb || '{
  "pricingCrawla": true,
  "jobSearch": true,
  "pricingCrawlaSearchesPerMonth": 400,
  "jobSearchesPerMonth": 400
}'::jsonb WHERE "tier" = 'PRO';

UPDATE "plan" SET "limits" = "limits"::jsonb || '{
  "pricingCrawla": true,
  "jobSearch": true,
  "pricingCrawlaSearchesPerMonth": -1,
  "jobSearchesPerMonth": -1
}'::jsonb WHERE "tier" = 'BUSINESS';
