"""sentence-transformers wrapper. Single global model — instances are
not thread-safe but FastAPI's default workers=1 makes this fine. Bump
to a pool when you go multi-worker."""

from __future__ import annotations

import threading

import structlog

from src.config import settings

log = structlog.get_logger()

_model = None
_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer  # lazy
                log.info("loading_embedder", model=settings.embedding_model)
                _model = SentenceTransformer(
                    settings.embedding_model,
                    device="cpu",
                )
    return _model


def warm_embedder() -> None:
    """Force-load + run a dummy encode at startup so the first user
    request doesn't pay 2–3s of import + warmup."""
    _get_model().encode(["warm"], normalize_embeddings=True)


def embed_text(text: str) -> list[float]:
    """Return a 384-dim L2-normalised embedding (cosine-ready)."""
    vec = _get_model().encode(text, normalize_embeddings=True)
    return [float(x) for x in vec.tolist()]
