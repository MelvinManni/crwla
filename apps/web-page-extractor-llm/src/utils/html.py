"""HTML → token-budgeted text. selectolax is 10× faster than bs4 for
the script/style/comment strip we need; bs4 stays as a fallback."""

from __future__ import annotations

import re

# Rough chars-per-token for Qwen 2.5 — good enough for budget truncation.
_CHARS_PER_TOKEN = 4


def html_to_text(html: str) -> str:
    if not html or not html.strip():
        return ""
    try:
        from selectolax.parser import HTMLParser  # lazy

        tree = HTMLParser(html)
        # Drop nodes that never carry product content.
        for sel in ("script", "style", "noscript", "iframe", "svg", "template"):
            for node in tree.css(sel):
                node.decompose()
        text = tree.text(separator=" ", strip=True)
    except Exception:  # noqa: BLE001 — fall through to bs4
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "lxml")
        for sel in ("script", "style", "noscript", "iframe", "svg", "template"):
            for node in soup.find_all(sel):
                node.decompose()
        text = soup.get_text(separator=" ", strip=True)

    # Collapse whitespace.
    return re.sub(r"\s+", " ", text).strip()


def truncate_to_token_budget(text: str, max_tokens: int) -> str:
    """Cheap char-based truncation. Underestimates tokens slightly so
    we don't blow the context window. Replace with the model's real
    tokenizer when you care about the exact boundary."""
    max_chars = max_tokens * _CHARS_PER_TOKEN
    if len(text) <= max_chars:
        return text
    # Keep the head — product pages put structured data near the top
    # (JSON-LD in <head>, title + price above the fold).
    return text[:max_chars] + " […truncated]"
