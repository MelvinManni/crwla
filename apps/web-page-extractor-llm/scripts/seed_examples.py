"""Bootstrap the `examples` corpus from a JSONL of curated extractions.

Each input row:
    {
      "bucket":  "amazon.com",
      "url":     "https://amazon.com/...",
      "goal":    "Extract the product listing on this page.",
      "schema":  { ... },
      "output":  { "title": "...", "price": 1199, "currency": "USD", ... },
      "notes":   "manually reviewed 2026-05-29"
    }

Embeddings are computed locally with the configured model and inserted
alongside the row. Re-running with the same (bucket, output) is safe —
no UNIQUE on the corpus, so dupes accumulate. De-dupe in the JSONL.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Allow running from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.db.connection import close_pool, init_pool  # noqa: E402
from src.db.repositories import ExamplesRepo  # noqa: E402
from src.utils.embeddings import embed_text, warm_embedder  # noqa: E402


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, type=Path)
    args = ap.parse_args()

    await init_pool()
    warm_embedder()

    repo = ExamplesRepo()
    inserted = 0
    with args.input.open() as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            # The embedding is computed over the (goal + output) so
            # retrieval matches on what the model is being primed to do.
            emb_text = f"{row['goal']}\n\n{json.dumps(row['output'])[:1000]}"
            await repo.insert(
                bucket=row["bucket"],
                url=row["url"],
                goal=row["goal"],
                schema=row.get("schema"),
                output=row["output"],
                notes=row.get("notes"),
                embedding=embed_text(emb_text),
            )
            inserted += 1
            if inserted % 25 == 0:
                print(f"[seed] {inserted}", flush=True)

    print(f"[seed] done — {inserted} rows inserted")
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
