-- web-page-extractor-llm — initial schema.
--
-- Two tables:
--   extractions  — every successful (URL, goal) extraction is logged here.
--                  Acts as both an audit trail and a hot cache: identical
--                  (url_hash, goal_hash, model) re-queries return the
--                  stored output without invoking the LLM.
--   examples     — the curated few-shot corpus. Populated by promoting
--                  high-confidence rows from `extractions` (via
--                  scripts/seed_examples.py or admin tooling).
--
-- pgvector dim: 384 (BAAI/bge-small-en-v1.5 default). If you swap to a
-- different sentence-transformers model, run a follow-up migration that
-- drops + re-creates the `embedding` columns at the new dimension.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ── extractions ────────────────────────────────────────────────
CREATE TABLE extractions (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  url_hash    CHAR(16)        NOT NULL,
  goal_hash   CHAR(16)        NOT NULL,
  url         TEXT            NOT NULL,
  goal        TEXT            NOT NULL,
  -- The JSON schema the caller supplied alongside the goal. Stored so a
  -- promotion-to-example step can re-validate later.
  schema      JSONB,
  model       TEXT            NOT NULL,
  -- The validated JSON the model returned.
  output      JSONB           NOT NULL,
  tokens_in   INTEGER         NOT NULL DEFAULT 0,
  tokens_out  INTEGER         NOT NULL DEFAULT 0,
  -- Latency of the model call, ms. Useful for tracking quantization
  -- vs. plan-size trade-offs.
  latency_ms  INTEGER         NOT NULL DEFAULT 0,
  -- 0..1 score from the validator. Rows below 0.5 are typically not
  -- promoted to examples and aren't used as few-shot.
  confidence  REAL            NOT NULL DEFAULT 1,
  -- Embedding of (url + goal + canonical page text snippet). Used by the
  -- retriever to find similar past extractions for few-shot priming.
  embedding   VECTOR(384),
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Identical re-queries short-circuit on this index — partial unique so
-- two different models can cache the same (url, goal) pair side by side.
CREATE UNIQUE INDEX extractions_cache_key
  ON extractions(url_hash, goal_hash, model);

CREATE INDEX extractions_url ON extractions(url);
CREATE INDEX extractions_created_desc ON extractions(created_at DESC);

-- ANN index for cosine similarity. ivfflat is the right pick on
-- Railway's managed Postgres (no HNSW build budget). Tune `lists` after
-- you have a few thousand rows: rule of thumb `sqrt(rowcount)`.
CREATE INDEX extractions_embedding_cos
  ON extractions
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ── examples (curated few-shot corpus) ─────────────────────────
CREATE TABLE examples (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Logical grouping. Usually a hostname (`amazon.com`) so the
  -- retriever can scope few-shot priming per-retailer, but free-form so
  -- it can also hold per-schema groups (e.g. "product_card",
  -- "job_posting").
  bucket       TEXT         NOT NULL,
  url          TEXT         NOT NULL,
  goal         TEXT         NOT NULL,
  schema       JSONB,
  output       JSONB        NOT NULL,
  -- Free-form notes for human reviewers. Not seen by the model.
  notes        TEXT,
  embedding    VECTOR(384)  NOT NULL,
  -- Examples can be paused without deletion — useful when a retailer
  -- redesigns and the canonical shape changes.
  active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX examples_bucket_active ON examples(bucket) WHERE active;
CREATE INDEX examples_embedding_cos
  ON examples
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Touch updated_at on row update.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER examples_touch_updated_at
  BEFORE UPDATE ON examples
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
