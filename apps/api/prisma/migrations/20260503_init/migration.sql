-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');
CREATE TYPE "CronPreset" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MANUAL');
CREATE TYPE "SearchStatus" AS ENUM ('RUNNING', 'PAUSED', 'ERROR');
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'OK', 'ERROR');
CREATE TYPE "AlertFrequency" AS ENUM ('REALTIME', 'HOURLY', 'DAILY');

-- CreateTable: User
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "team" TEXT,
  "role" "Role" NOT NULL DEFAULT 'MEMBER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastActiveAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable: AccessRequest
CREATE TABLE "AccessRequest" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "team" TEXT,
  "reason" TEXT,
  "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccessRequest_status_createdAt_idx" ON "AccessRequest"("status", "createdAt");

-- CreateTable: Search
CREATE TABLE "Search" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keywords" TEXT[],
  "locations" TEXT[],
  "sources" TEXT[],
  "cron" "CronPreset" NOT NULL DEFAULT 'DAILY',
  "filterPrompt" TEXT,
  "status" "SearchStatus" NOT NULL DEFAULT 'RUNNING',
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Search_userId_createdAt_idx" ON "Search"("userId", "createdAt");

-- CreateTable: Run
CREATE TABLE "Run" (
  "id" TEXT NOT NULL,
  "searchId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "status" "RunStatus" NOT NULL,
  "resultsCount" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER,
  "error" TEXT,
  CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Run_searchId_startedAt_idx" ON "Run"("searchId", "startedAt" DESC);

-- CreateTable: Result
CREATE TABLE "Result" (
  "id" TEXT NOT NULL,
  "searchId" TEXT NOT NULL,
  "runId" TEXT,
  "url" TEXT NOT NULL,
  "urlHash" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "snippet" TEXT,
  "source" TEXT NOT NULL,
  "location" TEXT,
  "score" DOUBLE PRECISION,
  "imageUrl" TEXT,
  "tag" TEXT,
  "publishedAt" TIMESTAMP(3),
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Result_searchId_urlHash_key" ON "Result"("searchId", "urlHash");
CREATE INDEX "Result_searchId_fetchedAt_idx" ON "Result"("searchId", "fetchedAt" DESC);
CREATE INDEX "Result_source_idx" ON "Result"("source");
CREATE INDEX "Result_location_idx" ON "Result"("location");

-- CreateTable: Alert
CREATE TABLE "Alert" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "searchId" TEXT,
  "keyword" TEXT NOT NULL,
  "sources" TEXT[],
  "locations" TEXT[],
  "frequency" "AlertFrequency" NOT NULL DEFAULT 'DAILY',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastTriggered" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Alert_userId_active_idx" ON "Alert"("userId", "active");

-- ForeignKeys
ALTER TABLE "Search" ADD CONSTRAINT "Search_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Run" ADD CONSTRAINT "Run_searchId_fkey"
  FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Result" ADD CONSTRAINT "Result_searchId_fkey"
  FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Result" ADD CONSTRAINT "Result_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_searchId_fkey"
  FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE SET NULL ON UPDATE CASCADE;
