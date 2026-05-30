"""Filter SERP hits to candidate commerce pages.

Drops hosts that show up in product searches but never carry an
actual product / buy page (news, reviews, social, encyclopaedias).
Port of the non-commerce blocklist from
apps/api/.../adapters/open-web.adapter.ts.
"""

from __future__ import annotations

from urllib.parse import urlparse


NON_COMMERCE_DOMAINS: frozenset[str] = frozenset({
    # News, reviews, encyclopaedias
    "wikipedia.org", "wikimedia.org",
    "theverge.com", "engadget.com", "techradar.com", "cnet.com",
    "arstechnica.com", "gizmodo.com", "tomshardware.com",
    "androidpolice.com", "macrumors.com", "9to5mac.com", "9to5google.com",
    "pcmag.com", "gsmarena.com", "phonearena.com", "mkbhd.com",
    "wired.com", "forbes.com", "businessinsider.com", "cnbc.com",
    "bloomberg.com", "reuters.com", "nytimes.com", "wsj.com",
    "medium.com", "substack.com",
    # Social
    "reddit.com", "twitter.com", "x.com", "facebook.com",
    "instagram.com", "tiktok.com", "youtube.com", "youtu.be",
    "pinterest.com", "linkedin.com",
    # Q&A / community
    "quora.com", "stackoverflow.com", "stackexchange.com",
})


def host_of(url: str) -> str | None:
    try:
        h = urlparse(url).hostname
        return h.lower().removeprefix("www.") if h else None
    except Exception:  # noqa: BLE001
        return None


def is_non_commerce(host: str) -> bool:
    for blocked in NON_COMMERCE_DOMAINS:
        if host == blocked or host.endswith(f".{blocked}"):
            return True
    return False


def store_name_from_host(host: str) -> str:
    """Derive a display store name from a hostname.

       newegg.com           → "Newegg"
       shop.example.co.uk   → "Example"
       mighty-ape.co.nz     → "Mighty Ape"
    """
    parts = host.split(".")
    root = parts[-2] if len(parts) >= 2 else parts[0]
    return " ".join(seg.capitalize() for seg in root.replace("_", "-").split("-") if seg)
