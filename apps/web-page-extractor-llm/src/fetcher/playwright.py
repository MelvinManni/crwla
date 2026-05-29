"""JS-rendered page fallback. Lazy-imports playwright so the unit-test
path doesn't pay the cost when running outside the container."""

from __future__ import annotations

import structlog

from src.config import settings

log = structlog.get_logger()


async def render_html(url: str) -> str | None:
    try:
        from playwright.async_api import async_playwright  # lazy
    except ImportError:
        log.warning("playwright_not_installed")
        return None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            try:
                ctx = await browser.new_context(user_agent=settings.user_agent)
                page = await ctx.new_page()
                await page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=settings.fetch_timeout_s * 1000 * 2,
                )
                # Give SPAs a beat to hydrate before snapshotting.
                await page.wait_for_timeout(800)
                content = await page.content()
            finally:
                await browser.close()
        return content
    except Exception as e:  # noqa: BLE001
        log.warning("render_failed", url=url, error=str(e))
        return None
