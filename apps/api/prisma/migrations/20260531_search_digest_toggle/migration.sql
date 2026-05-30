-- Owner-controlled toggle for the scheduled-crawl digest email. Defaults to
-- true so existing crawls keep receiving digests; the owner can flip it off
-- per crawl. Only consulted for DAILY/WEEKLY crawls — HOURLY and MANUAL never
-- send a digest regardless of this flag.

ALTER TABLE "search"
  ADD COLUMN "digest_enabled" BOOLEAN NOT NULL DEFAULT true;
