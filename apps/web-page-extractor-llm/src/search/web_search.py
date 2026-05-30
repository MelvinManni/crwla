"""DuckDuckGo HTML search with pagination — no API key.

Port of the TS WebSearchService in apps/api/.../web-search.service.ts.
Returns real organic result links from up to 10 SERPs deep.

DDG's HTML interface paginates via `s=N` offset (s=0 page 1, s=30
page 2, …, s=270 page 10). We walk pages sequentially with a small
pause between each to look less bot-like.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from urllib.parse import urlparse, parse_qs, unquote

import httpx
import structlog
from selectolax.parser import HTMLParser

log = structlog.get_logger()


@dataclass(slots=True)
class SearchHit:
    url: str
    title: str
    snippet: str


_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; web-page-extractor-llm/1.0)",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


async def search_ddg(
    query: str,
    *,
    pages: int = 3,
    limit: int = 100,
    timeout_s: float = 10.0,
) -> list[SearchHit]:
    """Search DDG HTML, paginate up to `pages` SERPs (max 10).

    Returns deduped hits across pages, capped at `limit`.
    """
    total_pages = max(1, min(10, pages))
    hits: list[SearchHit] = []
    seen: set[str] = set()

    async with httpx.AsyncClient(
        timeout=timeout_s,
        follow_redirects=True,
        headers=_HEADERS,
    ) as client:
        for page in range(total_pages):
            if len(hits) >= limit:
                break

            params: dict[str, str] = {"q": query, "kl": "us-en"}
            if page > 0:
                params["s"] = str(page * 30)

            try:
                r = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params=params,
                )
                if r.status_code != 200:
                    log.warning("ddg_non_200", page=page + 1, status=r.status_code)
                    break
                html = r.text
            except Exception as e:  # noqa: BLE001
                log.warning("ddg_fetch_failed", page=page + 1, error=str(e))
                break

            page_hits = _parse_serp(html, seen, limit - len(hits))
            log.debug(
                "ddg_page",
                page=page + 1,
                total_pages=total_pages,
                new_hits=len(page_hits),
                running=len(hits) + len(page_hits),
            )
            if not page_hits:
                break  # exhausted, no point paginating further
            hits.extend(page_hits)

            if page < total_pages - 1:
                await asyncio.sleep(0.25)

    return hits


def _parse_serp(html: str, seen: set[str], remaining: int) -> list[SearchHit]:
    """Extract hits from one SERP HTML, skipping URLs already in `seen`."""
    if remaining <= 0:
        return []
    tree = HTMLParser(html)
    out: list[SearchHit] = []
    for a in tree.css("a.result__a"):
        if len(out) >= remaining:
            break
        href = a.attributes.get("href")
        title = (a.text() or "").strip()
        if not href or not title:
            continue
        decoded = _unwrap_ddg(href)
        if not decoded or decoded in seen:
            continue
        seen.add(decoded)

        # Snippet sits in the nearest .result__snippet sibling
        snippet = ""
        parent = a.parent
        for _ in range(4):
            if parent is None:
                break
            snip = parent.css_first(".result__snippet")
            if snip is not None:
                snippet = (snip.text() or "").strip()[:280]
                break
            parent = parent.parent

        out.append(SearchHit(url=decoded, title=title, snippet=snippet))
    return out


def _unwrap_ddg(href: str) -> str | None:
    """DDG wraps every result in `/l/?uddg=<urlencoded>`; unwrap it.

    Bare http(s) URLs pass through.
    """
    try:
        if href.startswith("//"):
            href = f"https:{href}"
        if not href.startswith(("http://", "https://")):
            return None
        u = urlparse(href)
        if u.hostname and u.hostname.endswith("duckduckgo.com") and u.path == "/l/":
            qs = parse_qs(u.query)
            inner = qs.get("uddg", [None])[0]
            if not inner:
                return None
            return unquote(inner)
        return href
    except Exception:  # noqa: BLE001
        return None
