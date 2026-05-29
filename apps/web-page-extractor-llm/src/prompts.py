"""Locked system prompt. The fine-tuned model is trained against this
exact string — drift here breaks the contract. If you must change it,
re-generate training data and re-fine-tune.

~80 tokens. Tight on purpose so prompt caching is cheap and the model
has all of context to spend on the page.
"""

SYSTEM_PROMPT = (
    "You read web pages and extract structured data.\n\n"
    "Given HTML (or extracted text) and a goal that includes a JSON schema, "
    "return ONLY a JSON object matching the schema. Use only facts present "
    "on the page; null any field you cannot verify; never invent values. "
    "If prior example outputs from the same site are attached, mirror "
    "their shape. No prose, no markdown fences — JSON only."
)


def build_user_message(
    *,
    goal: str,
    schema: dict | None,
    page_text: str,
    examples: list[dict] | None = None,
) -> str:
    """Compose the user turn the model sees.

    Layout is deliberate: GOAL first (so the model knows what it's
    looking for before scanning), SCHEMA second (gives it the target
    shape), EXAMPLES third (priming), PAGE last (the bulk of the
    tokens; the model attends back to it after seeing the structure
    it needs to produce).
    """
    parts: list[str] = [f"GOAL: {goal}"]
    if schema is not None:
        parts.append(f"SCHEMA:\n{_dump_json(schema)}")
    if examples:
        parts.append("EXAMPLES (same site, prior reads):\n" + _dump_json(examples))
    parts.append("PAGE:\n" + page_text)
    return "\n\n".join(parts)


def build_repair_message(*, raw_output: str, error: str) -> str:
    """Second-pass message when the first output failed JSON-schema
    validation. We keep it minimal: the previous output + the validator
    error, with an instruction to fix it. No extra prose."""
    return (
        f"Your previous response failed validation: {error}\n\n"
        f"Previous response:\n{raw_output}\n\n"
        "Return a corrected JSON object matching the schema. JSON only."
    )


def _dump_json(value: object) -> str:
    import json

    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)
