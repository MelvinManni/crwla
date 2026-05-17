-- Per-user activity log. One row per action so we can both surface a
-- recent-events feed and aggregate counts by type / day for charts on the
-- admin member drawer. Targeted index pairs (user_id, created_at desc)
-- keep the "last N events" and "events in last 30 days" queries cheap.

CREATE TABLE "user_activity" (
  "id"          TEXT NOT NULL,
  "user_id"     TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "target_id"   TEXT,
  "metadata"    JSONB,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_activity_user_id_created_at_idx"
  ON "user_activity"("user_id", "created_at" DESC);

CREATE INDEX "user_activity_type_created_at_idx"
  ON "user_activity"("type", "created_at" DESC);

ALTER TABLE "user_activity"
  ADD CONSTRAINT "user_activity_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
