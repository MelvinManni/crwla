-- Onboarding walkthroughs: track per-user state for each flow so the UI
-- can replay only the ones a user hasn't dismissed/completed yet. Admins
-- are filtered at the API layer; no rows accumulate for them.

CREATE TYPE "OnboardingFlow" AS ENUM ('FIRST_LOGIN', 'FIRST_CRAWL');
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'COMPLETED', 'DISMISSED');

CREATE TABLE "onboarding_state" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "flow" "OnboardingFlow" NOT NULL,
  "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "dismissed_at" TIMESTAMP(3),

  CONSTRAINT "onboarding_state_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "onboarding_state_user_id_flow_key"
  ON "onboarding_state"("user_id", "flow");

CREATE INDEX "onboarding_state_user_id_status_idx"
  ON "onboarding_state"("user_id", "status");

ALTER TABLE "onboarding_state"
  ADD CONSTRAINT "onboarding_state_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
