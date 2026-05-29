#!/usr/bin/env bash
# Entrypoint: just runs uvicorn. Ollama is a SEPARATE service —
# locally via the `ollama` service in docker-compose.yml; in production
# as a sibling Railway service reachable at $OLLAMA_HOST.
#
# Why not still run ollama here? See top of Dockerfile — bundling the
# Ollama runtime in this image made builds fragile (single 1.5 GB curl
# of the upstream binary). Splitting lets each container have one
# responsibility AND lets Docker layer-pull resume properly on flaky
# networks.
#
# Model loading is handled out-of-band: `npm run llm:ollama:load`
# either pulls the public tag or builds a custom one from a local
# Modelfile against the external Ollama daemon. Triggered once
# per fresh Ollama volume.

set -euo pipefail

log() { printf "[start] %s\n" "$*"; }

PORT="${PORT:-8000}"
OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"

log "OLLAMA_HOST=${OLLAMA_HOST}"
log "MODEL_NAME=${MODEL_NAME:-<unset>}"

# Best-effort wait so the first request doesn't 502. We don't fail the
# boot if Ollama isn't reachable — `/ready` is the actual readiness
# gate and Railway healthchecks key off that, not this script.
for i in {1..30}; do
  if curl -fsS "http://${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
    log "ollama reachable"
    break
  fi
  if [[ $i -eq 30 ]]; then
    log "ollama not reachable after 30s — starting anyway, /ready will report"
  fi
  sleep 1
done

log "starting uvicorn on :${PORT}"
exec uvicorn src.main:app \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --workers 1 \
  --proxy-headers \
  --no-access-log
