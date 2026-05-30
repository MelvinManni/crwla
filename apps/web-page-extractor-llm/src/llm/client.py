"""Thin async client for Ollama's /api/chat. JSON-mode is enabled
when the caller passes a schema (we hint via response_format) — this
nudges the model toward parseable output even before grammar
constraints kick in."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from src.config import settings


@dataclass(slots=True)
class ChatResult:
    text: str
    model: str
    tokens_in: int
    tokens_out: int
    finish_reason: str


class OllamaClient:
    """One-shot client. Stateless — safe to instantiate per request."""

    def __init__(self, base_url: str | None = None, timeout: float = 600.0):
        self._base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self._timeout = timeout

    async def chat(
        self,
        *,
        messages: list[dict[str, str]],
        model: str,
        temperature: float = 0.1,
        top_p: float = 0.9,
        max_tokens: int = 2048,
        num_ctx: int | None = None,
        json_mode: bool = True,
    ) -> ChatResult:
        # `num_ctx` is the context-window size Ollama allocates for this
        # request. WITHOUT setting this, Ollama defaults to 2048 even
        # for models that nominally support 32K — the runtime sees only
        # the last 2K tokens of the prompt and silently drops the rest.
        # For schema-driven extraction that means the schema gets
        # truncated and the model returns garbage. Pass settings default
        # when caller doesn't override.
        ctx = num_ctx if num_ctx is not None else settings.llm_num_ctx

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "top_p": top_p,
                "num_predict": max_tokens,
                "num_ctx": ctx,
            },
            # Ollama supports "format": "json" which makes the runtime
            # try harder to emit a single JSON object. Cheap to enable.
            **({"format": "json"} if json_mode else {}),
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.post(f"{self._base_url}/api/chat", json=payload)
            r.raise_for_status()
            data = r.json()

        message = data.get("message") or {}
        return ChatResult(
            text=message.get("content", ""),
            model=data.get("model", model),
            tokens_in=int(data.get("prompt_eval_count", 0)),
            tokens_out=int(data.get("eval_count", 0)),
            finish_reason="stop" if data.get("done") else "length",
        )
