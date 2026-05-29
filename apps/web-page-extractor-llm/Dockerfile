# syntax=docker/dockerfile:1.7
#
# web-page-extractor-llm — FastAPI service image.
#
# Ollama runs as a SEPARATE container, not in this image. See
# docker-compose.yml for the local-dev pairing and the README for the
# two-service Railway deployment.
#
# Rationale: the Ollama runtime tarball is ~1.5 GB on arm64; pulling
# it as part of a Docker build is single-connection curl and dies on
# any network blip. Pulling `ollama/ollama` as its own image uses
# Docker's chunked + resumable layer protocol which is far more robust.
#
# Resources for THIS image: small (~600 MB). The model + GGUF live on
# the Ollama service's volume, not here.

# ────────── Stage 1: build Python deps into a wheelhouse ──────────
FROM python:3.12-slim AS python-builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip wheel --wheel-dir=/wheels -r requirements.txt

# ────────── Stage 2: slim Python runtime (no Ollama) ──────────
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    # Default points at the compose service name; override in
    # production (Railway: <ollama-service>.railway.internal:11434).
    OLLAMA_HOST=ollama:11434 \
    MODEL_NAME=qwen2.5:7b-instruct-q4_K_M \
    # FastAPI port — Railway injects $PORT, start.sh honours it.
    PORT=8000 \
    PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

WORKDIR /app

# ── Runtime OS deps ──────────────────────────────────────────────
# Trimmed: no curl/ollama install. tini for PID 1, libgomp for
# sentence-transformers, chromium runtime libs for Playwright headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates tini libgomp1 curl \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
      libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python deps from the prebuilt wheelhouse — no compilers in
# the runtime stage.
COPY --from=python-builder /wheels /wheels
COPY requirements.txt ./
RUN pip install --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

# Playwright chromium — single browser, single retry loop in case the
# CDN hiccups mid-download.
RUN for i in 1 2 3; do \
      python -m playwright install chromium && break; \
      echo "playwright install failed (attempt $i/3), retrying..."; \
      sleep 4; \
    done; \
    test -d "${PLAYWRIGHT_BROWSERS_PATH}" || { echo "playwright install gave up"; exit 1; }

# App code
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY db/ ./db/
RUN chmod +x scripts/*.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-8000}/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./scripts/start.sh"]
