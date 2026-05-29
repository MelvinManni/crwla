"""Data access for `extractions` and `examples`. Thin async-pg wrappers
— no ORM — so the SQL is greppable + we don't pay for SQLAlchemy boot."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from src.db.connection import get_pool


@dataclass(slots=True)
class CachedExtraction:
    output: dict[str, Any]
    model: str
    confidence: float


class ExtractionsRepo:
    async def lookup(
        self, *, url_hash: str, goal_hash: str, model: str
    ) -> CachedExtraction | None:
        pool = await get_pool()
        row = await pool.fetchrow(
            """
            SELECT output, model, confidence
              FROM extractions
             WHERE url_hash = $1 AND goal_hash = $2 AND model = $3
             ORDER BY created_at DESC
             LIMIT 1
            """,
            url_hash,
            goal_hash,
            model,
        )
        if row is None:
            return None
        return CachedExtraction(
            output=_loads(row["output"]),
            model=row["model"],
            confidence=float(row["confidence"]),
        )

    async def insert(
        self,
        *,
        url: str,
        url_hash: str,
        goal: str,
        goal_hash: str,
        schema: dict[str, Any] | None,
        model: str,
        output: dict[str, Any],
        tokens_in: int,
        tokens_out: int,
        latency_ms: int,
        confidence: float,
        embedding: list[float],
    ) -> None:
        pool = await get_pool()
        await pool.execute(
            """
            INSERT INTO extractions (
                url_hash, goal_hash, url, goal, schema, model,
                output, tokens_in, tokens_out, latency_ms, confidence,
                embedding
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::vector)
            ON CONFLICT (url_hash, goal_hash, model)
              DO UPDATE SET
                output = EXCLUDED.output,
                tokens_in = EXCLUDED.tokens_in,
                tokens_out = EXCLUDED.tokens_out,
                latency_ms = EXCLUDED.latency_ms,
                confidence = EXCLUDED.confidence,
                embedding = EXCLUDED.embedding,
                created_at = NOW()
            """,
            url_hash,
            goal_hash,
            url,
            goal,
            _dumps(schema) if schema is not None else None,
            model,
            _dumps(output),
            tokens_in,
            tokens_out,
            latency_ms,
            confidence,
            _vec_literal(embedding),
        )


class ExamplesRepo:
    async def insert(
        self,
        *,
        bucket: str,
        url: str,
        goal: str,
        schema: dict[str, Any] | None,
        output: dict[str, Any],
        notes: str | None,
        embedding: list[float],
    ) -> str:
        pool = await get_pool()
        row = await pool.fetchrow(
            """
            INSERT INTO examples (
                bucket, url, goal, schema, output, notes, embedding
            ) VALUES ($1,$2,$3,$4,$5,$6,$7::vector)
            RETURNING id
            """,
            bucket,
            url,
            goal,
            _dumps(schema) if schema is not None else None,
            _dumps(output),
            notes,
            _vec_literal(embedding),
        )
        return str(row["id"])


def _dumps(v: Any) -> str:
    return json.dumps(v, ensure_ascii=False)


def _loads(v: Any) -> dict[str, Any]:
    if isinstance(v, (dict, list)):
        return v  # asyncpg returns jsonb pre-parsed when configured
    return json.loads(v)


def _vec_literal(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"
