"""FastAPI entry. Lifespan opens the asyncpg pool + warms the embedding
model so the first request doesn't pay the import-time cost."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
import structlog

from src.api.routes import router as api_router
from src.config import settings
from src.db.connection import close_pool, init_pool
from src.utils.embeddings import warm_embedder


def _configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=True,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _configure_logging()
    log = structlog.get_logger()
    log.info("startup", model=settings.model_name, db=_safe_db_url())

    await init_pool()
    # Warm the embedding model (first encode is slow — ~3s).
    warm_embedder()

    log.info("ready")
    try:
        yield
    finally:
        await close_pool()
        log.info("shutdown")


app = FastAPI(
    title="web-page-extractor-llm",
    description="Structured-data extraction LLM with few-shot retrieval.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(api_router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Container-level liveness. Cheap — no DB / model touch."""
    return {"status": "ok"}


@app.get("/ready")
async def ready() -> dict[str, str]:
    """Readiness — used by Railway healthcheck. Pings Ollama + DB."""
    import httpx
    import asyncpg

    from src.db.connection import get_pool

    errors: dict[str, str] = {}
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            if r.status_code != 200:
                errors["ollama"] = f"status {r.status_code}"
    except Exception as e:  # noqa: BLE001
        errors["ollama"] = str(e)

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:  # type: asyncpg.Connection
            await conn.execute("SELECT 1")
    except Exception as e:  # noqa: BLE001
        errors["db"] = str(e)

    if errors:
        return {"status": "degraded", **errors}
    return {"status": "ready"}


def _safe_db_url() -> str:
    url = settings.database_url
    if "@" in url:
        # postgres://user:pass@host → postgres://user:***@host
        scheme_user, rest = url.split("@", 1)
        if ":" in scheme_user.split("//", 1)[-1]:
            scheme, ucreds = url.split("//", 1)
            user = ucreds.split(":", 1)[0]
            return f"{scheme}//{user}:***@{rest}"
    return url
