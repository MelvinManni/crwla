"""Few-shot retrieval via pgvector cosine similarity.

Two-tier strategy:
  1. Curated `examples` table, scoped to the request's bucket. These
     are reviewer-blessed gold standards.
  2. High-confidence (>= 0.8) rows from `extractions`, same bucket,
     used as a long tail when the curated corpus is sparse.

We union the two, sort by similarity, and take the top K above
`min_similarity`.
"""

from __future__ import annotations

from typing import Any

import structlog

from src.db.connection import get_pool

log = structlog.get_logger()


async def retrieve_similar_examples(
    *,
    bucket: str,
    embedding: list[float],
    k: int,
    min_similarity: float,
) -> list[dict[str, Any]]:
    pool = await get_pool()
    vec = _vec_literal(embedding)

    # `<=>` is pgvector cosine distance (0=identical, 2=opposite), so
    # similarity = 1 - distance. We filter on similarity at the
    # application layer to keep the query plan friendly to the ANN
    # index.
    #
    # Each branch of the UNION ALL must be parenthesized — Postgres
    # syntax rule when sub-queries carry their own ORDER BY + LIMIT.
    # Without the parens, the first ORDER BY/LIMIT is treated as
    # applying to the union and the second SELECT errors at `UNION`.
    query = f"""
        (SELECT 'curated' AS kind,
                bucket,
                output,
                1 - (embedding <=> $1::vector) AS similarity
           FROM examples
          WHERE active AND bucket = $2
          ORDER BY embedding <=> $1::vector
          LIMIT $3)
        UNION ALL
        (SELECT 'learned' AS kind,
                $2 AS bucket,
                output,
                1 - (embedding <=> $1::vector) AS similarity
           FROM extractions
          WHERE confidence >= 0.8
            AND url ILIKE '%' || $2 || '%'
          ORDER BY embedding <=> $1::vector
          LIMIT $3)
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, vec, bucket, k * 2)

    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for r in sorted(rows, key=lambda x: x["similarity"], reverse=True):
        if r["similarity"] < min_similarity:
            continue
        key = _dedup_key(r["output"])
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "output": r["output"],
                "__bucket": r["bucket"],
                "__kind": r["kind"],
                "__similarity": float(r["similarity"]),
            }
        )
        if len(out) >= k:
            break
    return out


def _vec_literal(v: list[float]) -> str:
    # pgvector accepts a string literal like "[1.0,2.0,3.0]".
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def _dedup_key(output: Any) -> str:
    import json
    try:
        return json.dumps(output, sort_keys=True)[:240]
    except Exception:  # noqa: BLE001
        return str(output)[:240]
