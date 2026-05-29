"""Generate ShareGPT JSONL training data for the QLoRA fine-tune.

Uses Claude as a teacher model: for each (URL, goal, schema) triple in
seeds.yaml, fetch the page, ask Claude to produce the canonical JSON,
then emit one ShareGPT row using the EXACT system prompt the inference
service uses. This keeps the train-time and serve-time contracts byte
identical.

Output schema (one row per JSONL line):
    {
      "conversations": [
        {"from": "system", "value": "<SYSTEM_PROMPT verbatim>"},
        {"from": "human",  "value": "GOAL: ...\\nSCHEMA: ...\\nPAGE: ..."},
        {"from": "gpt",    "value": "{\\"title\\": ...}"}
      ]
    }

Usage:
    export ANTHROPIC_API_KEY=...
    python training/synthetic_data_generator.py \
        --seeds training/seeds.yaml \
        --out   training/data/train.jsonl \
        --target 2000

Tips:
  - Aim for 500–2000 examples per schema variant.
  - Mix happy-path with hard negatives: pages where some fields are
    genuinely missing → train the model to emit nulls (not invent).
  - Hold out 5–10% as `eval.jsonl` for the trainer.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import random
import sys
from pathlib import Path

import httpx
import yaml

# Allow running as a script from anywhere in the repo.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.fetcher.http import fetch_html  # noqa: E402
from src.prompts import SYSTEM_PROMPT, build_user_message  # noqa: E402
from src.utils.html import html_to_text, truncate_to_token_budget  # noqa: E402

ANTHROPIC_MODEL = os.environ.get("TEACHER_MODEL", "claude-sonnet-4-6")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


async def teach(html_text: str, goal: str, schema: dict | None) -> str | None:
    """Ask Claude to produce the canonical JSON for this page+goal.
    Same system prompt the student model will be trained against."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY required")

    user = build_user_message(goal=goal, schema=schema, page_text=html_text)
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 2048,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user}],
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
        )
        if r.status_code != 200:
            return None
        data = r.json()

    blocks = data.get("content", [])
    return next((b.get("text") for b in blocks if b.get("type") == "text"), None)


def build_row(*, goal: str, schema: dict | None, page_text: str, assistant: str) -> dict:
    """Compose one ShareGPT row with the exact system + user the
    inference-time service uses. The model must learn to produce
    `assistant` from that exact input shape."""
    return {
        "conversations": [
            {"from": "system", "value": SYSTEM_PROMPT},
            {
                "from": "human",
                "value": build_user_message(
                    goal=goal,
                    schema=schema,
                    page_text=page_text,
                ),
            },
            {"from": "gpt", "value": assistant.strip()},
        ]
    }


async def process_seed(seed: dict, sem: asyncio.Semaphore) -> dict | None:
    async with sem:
        html, _ = await fetch_html(seed["url"])
        if not html:
            return None
        page_text = truncate_to_token_budget(html_to_text(html), 24_000)
        if len(page_text) < 200:
            return None
        assistant = await teach(page_text, seed["goal"], seed.get("schema"))
        if not assistant or "{" not in assistant:
            return None
        return build_row(
            goal=seed["goal"],
            schema=seed.get("schema"),
            page_text=page_text,
            assistant=assistant,
        )


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--target", type=int, default=2000)
    ap.add_argument("--concurrency", type=int, default=8)
    args = ap.parse_args()

    seeds: list[dict] = yaml.safe_load(args.seeds.read_text())
    random.shuffle(seeds)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(args.concurrency)

    written = 0
    with args.out.open("w") as fh:
        # Cycle through seeds in case `target > len(seeds)` — same URL
        # can yield distinct rows when goal/schema differs.
        idx = 0
        while written < args.target:
            seed = seeds[idx % len(seeds)]
            idx += 1
            row = await process_seed(seed, sem)
            if row is None:
                continue
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            fh.flush()
            written += 1
            if written % 25 == 0:
                print(f"[gen] {written}/{args.target}", flush=True)

    print(f"[gen] done — {written} rows → {args.out}")


if __name__ == "__main__":
    asyncio.run(main())
