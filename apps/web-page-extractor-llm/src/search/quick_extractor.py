"""Cheap deterministic product extraction.

Tries (in order) JSON-LD `Product`, OG product meta tags, microdata.
Returns None when the page doesn't carry structured product data —
the caller can then fall back to the LLM.

This exists so the search pipeline doesn't burn LLM tokens on pages
that already ship machine-readable product schemas (Amazon, Best Buy,
Walmart, Shopify-based stores all do).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

import httpx
import structlog
from selectolax.parser import HTMLParser

log = structlog.get_logger()


@dataclass(slots=True)
class QuickProduct:
    title: str
    price: float
    currency: str
    image: str | None
    brand: str | None
    rating: float | None
    review_count: int


_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; web-page-extractor-llm/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


async def quick_extract(url: str, *, timeout_s: float = 12.0) -> QuickProduct | None:
    """Fetch URL, try deterministic extraction. Returns None on miss."""
    html = await _fetch_html(url, timeout_s=timeout_s)
    if not html:
        return None

    tree = HTMLParser(html)
    for strategy in (_from_jsonld, _from_meta, _from_microdata):
        result = strategy(tree)
        if result is not None:
            return result
    return None


async def _fetch_html(url: str, *, timeout_s: float) -> str | None:
    try:
        async with httpx.AsyncClient(
            timeout=timeout_s,
            follow_redirects=True,
            headers=_HEADERS,
        ) as client:
            r = await client.get(url)
            if r.status_code >= 400:
                return None
            ct = r.headers.get("content-type", "")
            if "html" not in ct.lower():
                return None
            return r.text[:2_500_000]  # cap to avoid pathological pages
    except Exception:  # noqa: BLE001
        return None


# ── JSON-LD ──────────────────────────────────────────────────────

def _from_jsonld(tree: HTMLParser) -> QuickProduct | None:
    for node in tree.css('script[type="application/ld+json"]'):
        raw = (node.text() or "").strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        for prod in _walk_for_products(data):
            offer = _first_offer(prod)
            if offer is None:
                continue
            price = _num(offer.get("price") or offer.get("lowPrice") or offer.get("highPrice"))
            if price is None or price <= 0:
                continue
            title = _str(prod.get("name"))
            if not title:
                continue
            agg = prod.get("aggregateRating") or {}
            brand = prod.get("brand")
            if isinstance(brand, dict):
                brand = brand.get("name")
            return QuickProduct(
                title=title[:240],
                price=price,
                currency=(_str(offer.get("priceCurrency")) or "USD").upper()[:4],
                image=_first_image(prod.get("image")),
                brand=_str(brand) if isinstance(brand, str) else None,
                rating=_num(agg.get("ratingValue")),
                review_count=int(_num(agg.get("reviewCount") or agg.get("ratingCount")) or 0),
            )
    return None


def _walk_for_products(node: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if isinstance(node, list):
        for n in node:
            out.extend(_walk_for_products(n))
    elif isinstance(node, dict):
        if _is_product_node(node):
            out.append(node)
        graph = node.get("@graph")
        if isinstance(graph, list):
            out.extend(_walk_for_products(graph))
    return out


def _is_product_node(d: dict[str, Any]) -> bool:
    t = d.get("@type")
    if isinstance(t, str):
        return t in ("Product", "IndividualProduct")
    if isinstance(t, list):
        return any(x in ("Product", "IndividualProduct") for x in t)
    return False


def _first_offer(prod: dict[str, Any]) -> dict[str, Any] | None:
    o = prod.get("offers")
    if isinstance(o, list) and o:
        first = o[0]
        return first if isinstance(first, dict) else None
    if isinstance(o, dict):
        inner = o.get("offers")
        if isinstance(inner, list) and inner:
            f = inner[0]
            return f if isinstance(f, dict) else None
        return o
    return None


# ── OG meta tags ─────────────────────────────────────────────────

def _from_meta(tree: HTMLParser) -> QuickProduct | None:
    def m(selector: str, attr: str = "content") -> str | None:
        n = tree.css_first(selector)
        return n.attributes.get(attr) if n is not None else None

    title = m('meta[property="og:title"]') or m('meta[name="twitter:title"]')
    if not title:
        head_title = tree.css_first("title")
        if head_title is not None:
            title = (head_title.text() or "").strip()
    if not title:
        return None
    price = _num(
        m('meta[property="product:price:amount"]')
        or m('meta[property="og:price:amount"]')
    )
    if price is None or price <= 0:
        return None
    currency = (
        m('meta[property="product:price:currency"]')
        or m('meta[property="og:price:currency"]')
        or "USD"
    )
    image = m('meta[property="og:image"]') or m('meta[name="twitter:image"]')
    return QuickProduct(
        title=title.strip()[:240],
        price=price,
        currency=currency.upper()[:4],
        image=image,
        brand=None,
        rating=None,
        review_count=0,
    )


# ── Microdata ────────────────────────────────────────────────────

def _from_microdata(tree: HTMLParser) -> QuickProduct | None:
    scope = tree.css_first('[itemtype*="schema.org/Product"]')
    if scope is None:
        return None
    name_node = scope.css_first('[itemprop="name"]')
    name = (name_node.text() or "").strip() if name_node is not None else ""
    if not name:
        return None
    price_node = scope.css_first('[itemprop="price"]')
    price_raw = None
    if price_node is not None:
        price_raw = price_node.attributes.get("content") or (price_node.text() or "")
    price = _num(price_raw)
    if price is None or price <= 0:
        return None
    currency_node = scope.css_first('[itemprop="priceCurrency"]')
    currency = (
        currency_node.attributes.get("content") if currency_node is not None else None
    ) or "USD"
    image_node = scope.css_first('[itemprop="image"]')
    image = None
    if image_node is not None:
        image = image_node.attributes.get("src") or image_node.attributes.get("content")
    return QuickProduct(
        title=name[:240],
        price=price,
        currency=currency.upper()[:4],
        image=image,
        brand=None,
        rating=None,
        review_count=0,
    )


# ── Helpers ──────────────────────────────────────────────────────

def _num(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v) if v == v else None  # NaN check
    if isinstance(v, str):
        cleaned = re.sub(r"[^0-9.\-,]", "", v).replace(",", "")
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _str(v: Any) -> str | None:
    if isinstance(v, str) and v.strip():
        return v.strip()
    return None


def _first_image(v: Any) -> str | None:
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        for x in v:
            if isinstance(x, str):
                return x
            if isinstance(x, dict) and "url" in x:
                u = x["url"]
                return u if isinstance(u, str) else None
    if isinstance(v, dict):
        u = v.get("url")
        return u if isinstance(u, str) else None
    return None
