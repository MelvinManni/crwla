"""The five extraction nodes invoked by workflow.py. Each accepts
and returns a `State` dict (LangGraph convention) but is small enough
to call directly in tests."""

from __future__ import annotations

import time
from typing import Any

import structlog

from src.agent.retriever import retrieve_similar_examples
from src.agent.validator import validate_with_retry
from src.config import settings
from src.db.repositories import ExtractionsRepo
from src.fetcher.http import fetch_html
from src.fetcher.playwright import render_html
from src.llm.client import OllamaClient
from src.prompts import SYSTEM_PROMPT, build_user_message
from src.utils.embeddings import embed_text
from src.utils.hashing import goal_hash, url_hash
from src.utils.html import html_to_text, truncate_to_token_budget

log = structlog.get_logger()


async def fetch_node(state: dict[str, Any]) -> dict[str, Any]:
    """Resolve URL → readable text. Static fetch first; render only if
    the static body produces too little extractable text (likely SPA)."""
    req = state["req"]

    if req.html:
        text = html_to_text(req.html)
        return {"page_text": _budget(text), "final_url": req.url or "html-input"}

    assert req.url, "either url or html must be present"
    html, final_url = await fetch_html(req.url)
    text = html_to_text(html or "")
    if not settings.always_render_js and len(text) >= 400:
        return {"page_text": _budget(text), "final_url": final_url or req.url}

    # Static was empty or thin — escalate to Playwright.
    log.info("escalating to playwright", url=req.url, static_chars=len(text))
    rendered = await render_html(req.url)
    text = html_to_text(rendered or "")
    return {"page_text": _budget(text), "final_url": req.url}


async def retrieve_node(state: dict[str, Any]) -> dict[str, Any]:
    """Pull up to K similar past extractions from the curated `examples`
    corpus (and high-confidence rows from `extractions`)."""
    req = state["req"]
    bucket = state["bucket"]

    query_embedding = embed_text(_retrieval_query(req.goal, state["page_text"]))
    hits = await retrieve_similar_examples(
        bucket=bucket,
        embedding=query_embedding,
        k=settings.few_shot_k,
        min_similarity=settings.few_shot_min_sim,
    )
    return {"few_shot": hits}


async def extract_node(state: dict[str, Any]) -> dict[str, Any]:
    """Single Ollama call. We don't loop on validation here — that
    happens in validate_node so the validator owns its retry budget."""
    req = state["req"]
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": build_user_message(
                goal=req.goal,
                schema=req.schema_,
                page_text=state["page_text"],
                examples=[e["output"] for e in state.get("few_shot", [])] or None,
            ),
        },
    ]

    started = time.perf_counter()
    client = OllamaClient()
    result = await client.chat(
        messages=messages,
        model=settings.model_name,
        temperature=settings.llm_temperature,
        top_p=settings.llm_top_p,
        max_tokens=settings.llm_max_tokens,
    )
    latency = int((time.perf_counter() - started) * 1000)

    return {
        "raw_output": result.text,
        "tokens_in": result.tokens_in,
        "tokens_out": result.tokens_out,
        "latency_ms": latency,
        "model": result.model,
    }


async def validate_node(state: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON + validate against schema. Up to N corrective re-prompts
    when the model produces something unparseable or schema-invalid."""
    req = state["req"]
    parsed, attempts, confidence = await validate_with_retry(
        raw=state["raw_output"],
        schema=req.schema_,
        # Repair re-prompt context: same goal, same page, but no
        # examples (those were already tried in the first pass).
        repair_prompt_factory=lambda raw, err: [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_user_message(
                    goal=req.goal,
                    schema=req.schema_,
                    page_text=state["page_text"],
                ),
            },
            {"role": "assistant", "content": raw},
            {
                "role": "user",
                "content": (
                    f"Your previous response failed validation: {err}\n\n"
                    "Return a corrected JSON object matching the schema. JSON only."
                ),
            },
        ],
    )
    return {
        "parsed": parsed,
        "validation_attempts": attempts,
        "confidence": confidence,
    }


async def persist_node(state: dict[str, Any]) -> dict[str, Any]:
    """Write the audit/cache row. ALWAYS writes, even on validation
    failure — failures get a sentinel `output` with the validator
    attempts and a confidence of 0. The few-shot retriever filters
    on `confidence >= 0.8`, so failure rows can't poison priming;
    they're purely for audit + debugging.

    Best-effort: persistence failure never breaks the user response —
    we just lose an audit entry."""
    req = state["req"]
    parsed = state.get("parsed")
    confidence = float(state.get("confidence", 1.0))
    attempts = state.get("validation_attempts", [])

    # On failure, store a structured sentinel so the row is searchable
    # later ("show me everything where _failed=true") AND keeps the
    # NOT NULL constraint on `output` satisfied.
    if parsed is None:
        output_to_store: dict[str, Any] = {
            "_failed": True,
            "attempts": attempts,
            "tokens_in": state.get("tokens_in", 0),
            "tokens_out": state.get("tokens_out", 0),
        }
        confidence = 0.0
    else:
        output_to_store = parsed

    try:
        await ExtractionsRepo().insert(
            url=state.get("final_url") or req.url or "",
            url_hash=url_hash(state.get("final_url") or req.url or ""),
            goal=req.goal,
            goal_hash=goal_hash(req.goal, req.schema_),
            schema=req.schema_,
            model=state.get("model", settings.model_name),
            output=output_to_store,
            tokens_in=state.get("tokens_in", 0),
            tokens_out=state.get("tokens_out", 0),
            latency_ms=state.get("latency_ms", 0),
            confidence=confidence,
            embedding=embed_text(
                _retrieval_query(req.goal, state.get("page_text", "")),
            ),
        )
    except Exception as e:  # noqa: BLE001
        log.warning("persist_failed", error=str(e))
    return {}


# ── Helpers ──────────────────────────────────────────────────

def _budget(text: str) -> str:
    return truncate_to_token_budget(text, settings.max_page_tokens)


def _retrieval_query(goal: str, page_text: str) -> str:
    """Embedding input. We mix the goal with the first ~500 chars of
    the page so retrieval is biased by BOTH what the user wants AND
    what the page actually says."""
    return f"{goal}\n\n{page_text[:500]}"
