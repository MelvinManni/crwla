"""Public request/response shapes for the FastAPI service. Two surfaces:

  /extract                  — the primary, opinionated endpoint
  /v1/chat/completions      — OpenAI-compatible passthrough for tools
                              that already speak that protocol
"""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


# ── /extract ───────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    """The opinionated route. Caller hands us a URL (or pre-fetched
    HTML), a natural-language goal, and a JSON schema. We do the full
    workflow: fetch → retrieve few-shot → LLM → validate → persist."""

    url: str | None = None
    html: str | None = None
    goal: str
    schema_: dict[str, Any] | None = Field(default=None, alias="schema")
    # When set, scopes few-shot retrieval to a specific corpus bucket
    # (e.g. "amazon.com" or "product_card"). Defaults to the URL host.
    bucket: str | None = None
    # Force a fresh extraction — skip the (url_hash, goal_hash, model)
    # cache lookup. Useful after a retailer redesign.
    force: bool = False

    model_config = {"populate_by_name": True}


class ExtractResponse(BaseModel):
    output: dict[str, Any] | None
    cached: bool
    model: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    confidence: float
    # Each item is the bucket+similarity of an example used to prime
    # the LLM, so callers can debug why the model produced what it did.
    few_shot_used: list[dict[str, Any]] = Field(default_factory=list)
    # Any validation errors encountered before the final accepted output.
    validation_attempts: list[str] = Field(default_factory=list)


# ── OpenAI-compatible /v1/chat/completions ─────────────────────

class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatCompletionRequest(BaseModel):
    model: str | None = None
    messages: list[ChatMessage]
    temperature: float | None = None
    top_p: float | None = None
    max_tokens: int | None = None
    stream: bool = False
    # Optional response_format hint — when {"type": "json_object"} we
    # let the model produce raw JSON without forcing a schema validate.
    response_format: dict[str, Any] | None = None


class ChatChoice(BaseModel):
    index: int = 0
    message: ChatMessage
    finish_reason: str = "stop"


class ChatUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatCompletionResponse(BaseModel):
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: list[ChatChoice]
    usage: ChatUsage
