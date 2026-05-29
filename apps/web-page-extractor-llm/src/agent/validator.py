"""JSON extraction + schema validation with bounded corrective retries.

Three failure modes we handle:
  1. Output is not parseable JSON (model wrapped it in prose, fences,
     or truncated mid-object).
  2. Parsed JSON doesn't validate against the schema.
  3. Repair loop exhausted retries — we return the last best parse with
     a low confidence score so the caller can decide what to do.
"""

from __future__ import annotations

import json
import re
from typing import Any, Callable, Awaitable

import jsonschema
import structlog

from src.config import settings
from src.llm.client import OllamaClient

log = structlog.get_logger()

# Strip ```json … ``` and ``` … ``` fences before parsing — most "no
# markdown fences" violations come back as the only thing the model got
# wrong, so cleaning them is cheaper than a re-prompt.
_FENCE_RE = re.compile(r"```(?:json)?\s*(.+?)\s*```", re.DOTALL)


async def validate_with_retry(
    *,
    raw: str,
    schema: dict[str, Any] | None,
    repair_prompt_factory: Callable[[str, str], list[dict[str, str]]],
    llm_chat: Callable[[list[dict[str, str]]], Awaitable[Any]] | None = None,
) -> tuple[dict[str, Any] | None, list[str], float]:
    """Return (parsed, attempts, confidence).

    `attempts` lists each error message we encountered so callers can
    surface it in their audit log.
    """
    attempts: list[str] = []
    current_raw = raw

    chat = llm_chat or _default_chat

    for i in range(settings.max_validation_retries + 1):
        parsed_or_err = _parse_and_validate(current_raw, schema)
        if isinstance(parsed_or_err, dict):
            # First-pass success → confidence 1.0. Each retry shaves it
            # so callers can tell repaired outputs apart from clean ones.
            confidence = max(0.5, 1.0 - 0.2 * i)
            return parsed_or_err, attempts, confidence

        err = parsed_or_err
        attempts.append(err)
        if i >= settings.max_validation_retries:
            break

        log.info("repair_attempt", attempt=i + 1, error=err)
        repair_messages = repair_prompt_factory(current_raw, err)
        result = await chat(repair_messages)
        current_raw = result.text

    # All retries failed. Last-ditch: extract whatever JSON-looking
    # blob is in the final raw. If even that fails, return None — caller
    # handles by surfacing the attempts log.
    salvaged = _best_effort_parse(current_raw)
    return salvaged, attempts, 0.25 if salvaged else 0.0


def _parse_and_validate(
    text: str,
    schema: dict[str, Any] | None,
) -> dict[str, Any] | str:
    """Try to parse `text` as JSON, optionally validate against schema.
    Returns the parsed dict on success, or an error string on failure."""
    cleaned = text.strip()
    fence_match = _FENCE_RE.search(cleaned)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Fallback: grab the first balanced {...} block. Catches the
        # common "model added a trailing sentence" failure mode.
        salvaged = _best_effort_parse(cleaned)
        if salvaged is None:
            return f"JSON parse error: {e.msg}"
        parsed = salvaged

    if not isinstance(parsed, dict):
        return "Top-level JSON must be an object."

    if schema is None:
        return parsed

    try:
        jsonschema.validate(parsed, schema)
    except jsonschema.ValidationError as e:
        path = ".".join(str(p) for p in e.absolute_path) or "<root>"
        return f"Schema violation at {path}: {e.message}"

    return parsed


def _best_effort_parse(text: str) -> dict[str, Any] | None:
    # Find the first { and the matching }, parse what's between.
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


async def _default_chat(messages: list[dict[str, str]]) -> Any:
    client = OllamaClient()
    return await client.chat(
        messages=messages,
        model=settings.model_name,
        temperature=settings.llm_temperature,
        top_p=settings.llm_top_p,
        max_tokens=settings.llm_max_tokens,
    )
