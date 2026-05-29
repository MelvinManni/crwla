"""Public HTTP surface. Two routes:

  POST /extract                  → opinionated full-workflow endpoint
  POST /v1/chat/completions      → OpenAI-compatible thin passthrough

Both honour optional Bearer auth (API_TOKEN env)."""

from __future__ import annotations

import time
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from src.agent.workflow import run_extraction
from src.config import settings
from src.llm.client import OllamaClient
from src.prompts import SYSTEM_PROMPT
from src.schemas import (
    ChatChoice,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatMessage,
    ChatUsage,
    ExtractRequest,
    ExtractResponse,
)

router = APIRouter()


async def require_token(request: Request) -> None:
    if not settings.api_token:
        return
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    if auth.removeprefix("Bearer ").strip() != settings.api_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")


# ── /extract ──────────────────────────────────────────────────

@router.post("/extract", response_model=ExtractResponse)
async def extract(
    req: ExtractRequest,
    _: Annotated[None, Depends(require_token)],
) -> ExtractResponse:
    if not req.url and not req.html:
        raise HTTPException(400, "either `url` or `html` is required")
    return await run_extraction(req)


# ── /v1/chat/completions ──────────────────────────────────────

@router.post("/v1/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(
    req: ChatCompletionRequest,
    _: Annotated[None, Depends(require_token)],
) -> ChatCompletionResponse:
    """OpenAI-compatible passthrough. Useful for callers that already
    speak that protocol (LangChain, llama-index, raw cURL examples)
    — no few-shot retrieval, no validation; the caller owns the loop."""
    if not req.messages:
        raise HTTPException(400, "messages cannot be empty")

    # Force the locked system prompt to lead, even when the caller
    # supplied their own — guarantees the contract.
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in req.messages:
        if m.role == "system":
            continue  # discard caller's system message
        messages.append({"role": m.role, "content": m.content})

    client = OllamaClient()
    result = await client.chat(
        messages=messages,
        model=req.model or settings.model_name,
        temperature=req.temperature if req.temperature is not None else settings.llm_temperature,
        top_p=req.top_p if req.top_p is not None else settings.llm_top_p,
        max_tokens=req.max_tokens or settings.llm_max_tokens,
    )

    return ChatCompletionResponse(
        id=f"chatcmpl-{uuid.uuid4().hex[:24]}",
        created=int(time.time()),
        model=result.model,
        choices=[
            ChatChoice(
                message=ChatMessage(role="assistant", content=result.text),
                finish_reason=result.finish_reason,
            )
        ],
        usage=ChatUsage(
            prompt_tokens=result.tokens_in,
            completion_tokens=result.tokens_out,
            total_tokens=result.tokens_in + result.tokens_out,
        ),
    )
