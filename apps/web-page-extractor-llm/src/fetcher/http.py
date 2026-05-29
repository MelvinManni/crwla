"""Static HTTP fetcher. Cheap, fast, sufficient for most retailer
product pages (which ship JSON-LD + OG server-side)."""

from __future__ import annotations

import httpx
import structlog

from src.config import settings

log = structlog.get_logger()


async def fetch_html(url: str) -> tuple[str | None, str | None]:
    """Return (html, final_url) or (None, None) on failure."""
    try:
        async with httpx.AsyncClient(
            timeout=settings.fetch_timeout_s,
            follow_redirects=True,
            headers={
                "User-Agent": settings.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        ) as client:
            r = await client.get(url)
            r.raise_for_status()
            if "html" not in (r.headers.get("content-type") or "").lower():
                return None, str(r.url)
            return r.text, str(r.url)
    except Exception as e:  # noqa: BLE001
        log.warning("fetch_failed", url=url, error=str(e))
        return None, None
