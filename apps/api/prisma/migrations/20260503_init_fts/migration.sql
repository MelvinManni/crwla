-- CRWLA full-text search column + GIN index.
--
-- Adds a generated tsvector column to "Result" and a GIN index for fast
-- websearch_to_tsquery lookups. Both are managed here (not by Prisma) because
-- Prisma does not yet support GENERATED ALWAYS AS ... STORED columns.
--
-- Idempotent: safe to re-run after a `prisma migrate reset` or against a
-- partially-migrated database.

-- 1. Generated tsvector column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Result' AND column_name = 'searchVector'
  ) THEN
    ALTER TABLE "Result"
    ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (
      to_tsvector(
        'english',
        coalesce(title, '') || ' ' ||
        coalesce(snippet, '') || ' ' ||
        coalesce((metadata->>'keywords')::text, '')
      )
    ) STORED;
  END IF;
END$$;

-- 2. GIN index. CONCURRENTLY can't run inside a transaction, and Prisma
-- wraps each migration in one — so we use a plain index here. For very
-- large existing tables run the CONCURRENT version manually instead:
--
--   CREATE INDEX CONCURRENTLY idx_result_search_vector
--     ON "Result" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS idx_result_search_vector
  ON "Result" USING GIN ("searchVector");

-- 3. Composite filter index — accelerates source/location facets when an FTS
-- query is also present.
CREATE INDEX IF NOT EXISTS idx_result_source_location
  ON "Result" (source, location)
  WHERE "searchVector" IS NOT NULL;
