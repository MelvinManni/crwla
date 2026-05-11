-- Contact-form submissions captured from the public landing site.

-- CreateEnum
CREATE TYPE "ContactPurpose" AS ENUM ('DEMO', 'SALES', 'PRESS', 'SUPPORT', 'OTHER');

-- CreateTable
CREATE TABLE "contact_submission" (
  "id"          TEXT NOT NULL,
  "purpose"     "ContactPurpose" NOT NULL DEFAULT 'OTHER',
  "name"        TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "company"     TEXT,
  "role"        TEXT,
  "volume"      INTEGER,
  "message"     TEXT,
  "ip_address"  TEXT,
  "user_agent"  TEXT,
  "emailed_at"  TIMESTAMP(3),
  "email_error" TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contact_submission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_submission_created_at_idx" ON "contact_submission"("created_at");
