"""asyncpg pool — opened in lifespan, closed on shutdown."""

from __future__ import annotations

import asyncpg
import structlog

from src.config import settings

log = structlog.get_logger()

_pool: asyncpg.Pool | None = None


async def init_pool(min_size: int = 1, max_size: int = 10) -> None:
    global _pool
    if _pool is not None:
        return
    _pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=min_size,
        max_size=max_size,
        command_timeout=30,
    )
    log.info("db_pool_ready", min=min_size, max=max_size)


async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        await init_pool()
    assert _pool is not None
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
