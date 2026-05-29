"""Extraction workflow.

Nodes (in order):
  1. cache_lookup    — skip everything if (url_hash, goal_hash, model) is cached
  2. fetch_page      — HTTP fallback to Playwright on empty body
  3. retrieve        — pgvector cosine search for few-shot examples
  4. extract         — LLM call with the locked system prompt
  5. validate        — jsonschema + corrective retry loop
  6. persist         — write the audit/cache row

LangGraph is used for the orchestration so each node is independently
testable (`test_workflow.py` patches one at a time). If LangGraph ever
becomes too heavy we can swap to a plain sequential function — the
node signatures already match that shape.
"""

from __future__ import annotations

import time
from typing import Any, TypedDict
from urllib.parse import urlparse

import structlog
from langgraph.graph import END, START, StateGraph

from src.agent.nodes import (
    extract_node,
    fetch_node,
    persist_node,
    retrieve_node,
    validate_node,
)
from src.config import settings
from src.db.repositories import ExtractionsRepo
from src.schemas import ExtractRequest, ExtractResponse
from src.utils.hashing import goal_hash, url_hash

log = structlog.get_logger()


class State(TypedDict, total=False):
    # Input
    req: ExtractRequest
    bucket: str
    # Fetch
    page_text: str
    final_url: str
    # Retrieve
    few_shot: list[dict[str, Any]]
    # LLM
    raw_output: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    model: str
    # Validate
    parsed: dict[str, Any] | None
    validation_attempts: list[str]
    confidence: float
    # Cache
    cached: bool
    cached_response: ExtractResponse | None


def _build_graph():
    g: StateGraph = StateGraph(State)
    g.add_node("fetch", fetch_node)
    g.add_node("retrieve", retrieve_node)
    g.add_node("extract", extract_node)
    g.add_node("validate", validate_node)
    g.add_node("persist", persist_node)

    g.add_edge(START, "fetch")
    g.add_edge("fetch", "retrieve")
    g.add_edge("retrieve", "extract")
    g.add_edge("extract", "validate")
    g.add_edge("validate", "persist")
    g.add_edge("persist", END)
    return g.compile()


_GRAPH = _build_graph()


async def run_extraction(req: ExtractRequest) -> ExtractResponse:
    started = time.perf_counter()

    # Cache lookup is cheap — single indexed row read. We skip the
    # whole graph on a hit, including the fetch + LLM cost.
    if not req.force and req.url:
        cached = await ExtractionsRepo().lookup(
            url_hash=url_hash(req.url),
            goal_hash=goal_hash(req.goal, req.schema_),
            model=settings.model_name,
        )
        if cached is not None:
            return ExtractResponse(
                output=cached.output,
                cached=True,
                model=cached.model,
                tokens_in=0,
                tokens_out=0,
                latency_ms=int((time.perf_counter() - started) * 1000),
                confidence=cached.confidence,
                few_shot_used=[],
                validation_attempts=[],
            )

    bucket = req.bucket or (
        urlparse(req.url).hostname.removeprefix("www.") if req.url else "default"
    )

    state: State = {"req": req, "bucket": bucket}
    final: State = await _GRAPH.ainvoke(state)  # type: ignore[assignment]

    return ExtractResponse(
        output=final.get("parsed"),
        cached=False,
        model=final.get("model", settings.model_name),
        tokens_in=final.get("tokens_in", 0),
        tokens_out=final.get("tokens_out", 0),
        latency_ms=final.get("latency_ms", 0),
        confidence=final.get("confidence", 0.0),
        few_shot_used=[
            {"bucket": e.get("__bucket"), "similarity": e.get("__similarity")}
            for e in final.get("few_shot", [])
        ],
        validation_attempts=final.get("validation_attempts", []),
    )
