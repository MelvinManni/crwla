"""Stable hashes for the cache key. 16-char hex is plenty — 2^64 space,
collision-free in practice for the scales we run at."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def url_hash(url: str) -> str:
    """Canonicalize-then-sha1. Strips fragment + lowercases host."""
    canonical = _canonical_url(url)
    return hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:16]


def goal_hash(goal: str, schema: dict[str, Any] | None) -> str:
    """Different (goal, schema) pairs cache separately — changing the
    schema invalidates the cache (intended: the output shape changes)."""
    payload = json.dumps(
        {"g": goal.strip(), "s": schema or {}},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]


def _canonical_url(url: str) -> str:
    from urllib.parse import urlparse, urlunparse

    try:
        p = urlparse(url.strip())
        # Drop fragment; lowercase host; strip default ports.
        netloc = p.hostname.lower() if p.hostname else ""
        if p.port and not (
            (p.scheme == "http" and p.port == 80)
            or (p.scheme == "https" and p.port == 443)
        ):
            netloc += f":{p.port}"
        path = p.path or "/"
        if path.endswith("/") and len(path) > 1:
            path = path[:-1]
        return urlunparse((p.scheme.lower(), netloc, path, p.params, p.query, ""))
    except Exception:  # noqa: BLE001
        return url.strip()
