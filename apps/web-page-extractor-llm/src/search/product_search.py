"""Orchestrator: product query → ranked list of buyable listings.

Pipeline:
  1. DDG search (up to 10 SERPs)
  2. Filter non-commerce hosts
  3. For each candidate URL in bounded parallel:
       a. quick_extract (JSON-LD / OG / microdata)
       b. fall back to LLM extract on miss (cheap retailers usually
          satisfy step a; long-tail open-web hosts may need step b)
  4. Dedupe by URL, score by price + confidence + trust
  5. Return top N sorted (cheapest with credible confidence first)
"""

from __future__ import annotations

import asyncio
import math
from dataclasses import asdict, dataclass
from typing import Any
from urllib.parse import urlparse

import structlog

from src.config import settings
from src.search.quick_extractor import QuickProduct, quick_extract
from src.search.url_filter import host_of, is_non_commerce, store_name_from_host
from src.search.web_search import search_ddg

log = structlog.get_logger()


@dataclass(slots=True)
class ProductListing:
    title: str
    price: float
    currency: str
    url: str
    store: str
    image: str | None
    brand: str | None
    rating: float | None
    review_count: int
    source: str  # "quick" | "llm"
    confidence: float
    rank_score: float


async def search_products(
    *,
    query: str,
    pages: int = 5,
    limit: int = 20,
    concurrency: int = 6,
    use_llm_fallback: bool = True,
) -> dict[str, Any]:
    """Return ranked listings for `query`. Top-level entry."""

    started = asyncio.get_event_loop().time()

    # 1. SEARCH ───────────────────────────────────────────────────
    hits = await search_ddg(query, pages=pages, limit=limit * 5)
    log.info("search_complete", query=query, hits=len(hits), pages=pages)

    # 2. FILTER ───────────────────────────────────────────────────
    candidates = []
    seen_hosts: dict[str, int] = {}
    for h in hits:
        host = host_of(h.url)
        if not host or is_non_commerce(host):
            continue
        # Cap per-host so one store doesn't dominate the candidate pool.
        if seen_hosts.get(host, 0) >= 2:
            continue
        seen_hosts[host] = seen_hosts.get(host, 0) + 1
        candidates.append(h)
    log.info("filter_complete", kept=len(candidates), distinct_hosts=len(seen_hosts))

    # 3. EXTRACT in bounded parallel ──────────────────────────────
    sem = asyncio.Semaphore(concurrency)
    quick_count = 0
    llm_count = 0
    failed_count = 0
    listings: list[ProductListing] = []

    async def process(hit) -> ProductListing | None:
        nonlocal quick_count, llm_count, failed_count
        async with sem:
            host = host_of(hit.url) or "unknown"
            store = store_name_from_host(host)

            quick = await quick_extract(hit.url)
            if quick is not None:
                quick_count += 1
                return _to_listing(quick, hit.url, store, source="quick", confidence=0.9)

            if not use_llm_fallback or not settings.llm_num_ctx:
                failed_count += 1
                return None

            # LLM fallback — lazy import to avoid circular at module load
            from src.agent.workflow import run_extraction  # noqa: PLC0415
            from src.schemas import ExtractRequest  # noqa: PLC0415

            try:
                req = ExtractRequest(
                    url=hit.url,
                    goal=f"Extract the product listing for: {query}.",
                    bucket=host,
                )
                req.schema_ = PRODUCT_SCHEMA  # type: ignore[attr-defined]
                resp = await run_extraction(req)
                if resp.output and isinstance(resp.output, dict):
                    p = _from_llm_output(resp.output, hit.url, store, resp.confidence)
                    if p is not None:
                        llm_count += 1
                        return p
            except Exception as e:  # noqa: BLE001
                log.warning("llm_fallback_failed", url=hit.url, error=str(e))

            failed_count += 1
            return None

    results = await asyncio.gather(*[process(h) for h in candidates])
    for r in results:
        if r is not None:
            listings.append(r)

    # 4. DEDUPE + RANK ────────────────────────────────────────────
    deduped = _dedupe(listings)
    ranked = _rank(deduped)

    elapsed_ms = int((asyncio.get_event_loop().time() - started) * 1000)

    log.info(
        "search_products_done",
        query=query,
        candidates=len(candidates),
        kept=len(ranked),
        quick=quick_count,
        llm=llm_count,
        failed=failed_count,
        elapsed_ms=elapsed_ms,
    )

    return {
        "query": query,
        "results": [asdict(p) for p in ranked[:limit]],
        "stats": {
            "search_hits": len(hits),
            "candidates": len(candidates),
            "kept": len(ranked),
            "quick_extract": quick_count,
            "llm_extract": llm_count,
            "failed": failed_count,
            "elapsed_ms": elapsed_ms,
            "pages_walked": pages,
        },
    }


# ── Helpers ──────────────────────────────────────────────────────

PRODUCT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": ["string", "null"]},
        "price": {"type": ["number", "null"]},
        "currency": {"type": ["string", "null"]},
        "image": {"type": ["string", "null"]},
        "brand": {"type": ["string", "null"]},
        "rating": {"type": ["number", "null"]},
        "reviewCount": {"type": ["integer", "null"]},
    },
    "required": ["title", "price", "currency"],
}


def _to_listing(
    p: QuickProduct,
    url: str,
    store: str,
    *,
    source: str,
    confidence: float,
) -> ProductListing:
    return ProductListing(
        title=p.title,
        price=p.price,
        currency=p.currency,
        url=url,
        store=store,
        image=p.image,
        brand=p.brand,
        rating=p.rating,
        review_count=p.review_count,
        source=source,
        confidence=confidence,
        rank_score=0.0,  # filled in by _rank
    )


def _from_llm_output(
    output: dict[str, Any],
    url: str,
    store: str,
    confidence: float,
) -> ProductListing | None:
    title = output.get("title")
    price = output.get("price")
    if not isinstance(title, str) or not title:
        return None
    if not isinstance(price, (int, float)) or price <= 0:
        return None
    return ProductListing(
        title=title[:240],
        price=float(price),
        currency=(str(output.get("currency") or "USD")).upper()[:4],
        url=url,
        store=store,
        image=output.get("image") if isinstance(output.get("image"), str) else None,
        brand=output.get("brand") if isinstance(output.get("brand"), str) else None,
        rating=float(output["rating"]) if isinstance(output.get("rating"), (int, float)) else None,
        review_count=int(output["reviewCount"]) if isinstance(output.get("reviewCount"), int) else 0,
        source="llm",
        confidence=confidence,
        rank_score=0.0,
    )


def _dedupe(items: list[ProductListing]) -> list[ProductListing]:
    """One listing per (host, normalized-title) — keep cheapest."""
    out: dict[tuple[str, str], ProductListing] = {}
    for it in items:
        host = urlparse(it.url).hostname or ""
        key = (host, it.title.lower()[:80])
        prev = out.get(key)
        if prev is None or it.price < prev.price:
            out[key] = it
    return list(out.values())


def _rank(items: list[ProductListing]) -> list[ProductListing]:
    """Composite score: cheapest + confident wins.

    weights:
        0.6 inverse-price (z-normalized, cheapest = 1)
        0.3 confidence
        0.1 review-count log-norm
    """
    if not items:
        return []
    prices = [i.price for i in items]
    p_min, p_max = min(prices), max(prices)
    span = max(p_max - p_min, 1e-6)

    for it in items:
        price_norm = 1.0 - (it.price - p_min) / span
        review_norm = math.log10(it.review_count + 1) / 4 if it.review_count else 0.0
        it.rank_score = round(
            0.6 * price_norm + 0.3 * it.confidence + 0.1 * min(1.0, review_norm),
            4,
        )
    return sorted(items, key=lambda x: x.rank_score, reverse=True)
