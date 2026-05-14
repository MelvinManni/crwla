-- 2-of-3 dedup on Result: combined with the existing (search_id, url_hash)
-- unique, the new (search_id, title_hash, snippet_hash) unique blocks any
-- pair matching on (url+title), (url+snippet), or (title+snippet).
--
-- Normalization (lower + collapsed whitespace + trim) matches the runtime
-- `textHash()` helper so backfilled hashes line up with hashes the API
-- writes from this point forward.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "result" ADD COLUMN "title_hash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "result" ADD COLUMN "snippet_hash" TEXT NOT NULL DEFAULT '';

UPDATE "result"
SET
  title_hash = LEFT(
    encode(
      digest(
        TRIM(regexp_replace(LOWER(COALESCE(title, '')), '\s+', ' ', 'g')),
        'sha1'
      ),
      'hex'
    ),
    16
  ),
  snippet_hash = LEFT(
    encode(
      digest(
        TRIM(regexp_replace(LOWER(COALESCE(snippet, '')), '\s+', ' ', 'g')),
        'sha1'
      ),
      'hex'
    ),
    16
  );

-- Collapse existing duplicates before the unique index goes on, otherwise
-- the index creation would fail. Keep the oldest row per partition (ties
-- broken by id) so historical fetch order is preserved.
DELETE FROM "result"
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY search_id, title_hash, snippet_hash
        ORDER BY fetched_at ASC, id ASC
      ) AS rn
    FROM "result"
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX "result_search_id_title_hash_snippet_hash_key"
  ON "result"("search_id", "title_hash", "snippet_hash");
