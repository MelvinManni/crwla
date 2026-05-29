#!/usr/bin/env bash
# Load the configured model into the external Ollama daemon.
# Run this ONCE per fresh Ollama volume.
#
#   - If MODELFILE_PATH is set and the file exists → build a custom tag
#     from a local GGUF (the fine-tuned web-page-extractor-llm path).
#   - Otherwise → pull the public tag from the Ollama registry.
#
# Usage:
#   OLLAMA_HOST=localhost:11434 MODEL_NAME=qwen2.5:7b-instruct-q4_K_M \
#     ./scripts/load_model.sh
#
# Or via the npm wrapper from the repo root:
#   npm run llm:ollama:load

set -euo pipefail

log() { printf "[load-model] %s\n" "$*"; }

OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
MODEL_NAME="${MODEL_NAME:-qwen2.5:7b-instruct-q4_K_M}"
MODELFILE_PATH="${MODELFILE_PATH:-}"

log "host=${OLLAMA_HOST} model=${MODEL_NAME}"

# Fail fast on a refused TCP connection — that almost always means
# the compose stack isn't running, and the user wants to know that
# in 1 second, not 2 minutes.
probe() {
  curl -fsS --connect-timeout 2 --max-time 5 \
    -o /dev/null -w "%{http_code}\n" \
    "http://${OLLAMA_HOST}/api/tags" 2>&1
}

initial="$(probe || true)"
case "${initial}" in
  200) log "ollama reachable" ;;
  *Connection*refused*|*"Failed to connect"*)
    cat >&2 <<EOF

[load-model] ERROR: nothing listening on ${OLLAMA_HOST}.

Most likely the compose stack isn't running. In another shell:

    npm run llm:docker:run

Then re-run this command. If you're running ollama directly on the
host, override OLLAMA_HOST (it currently resolves to ${OLLAMA_HOST}).
EOF
    exit 1
    ;;
  *)
    # Got SOMETHING back — daemon is alive but not ready yet. Poll
    # for up to 2 min with progress every 5s so the user sees motion.
    log "waiting for ollama API (initial response: '${initial}')..."
    for i in {1..120}; do
      if curl -fsS --connect-timeout 2 --max-time 5 \
           "http://${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
        log "ollama reachable after ${i}s"
        break
      fi
      if [[ $i -eq 120 ]]; then
        log "ERROR: ollama still not reachable after 2 min at ${OLLAMA_HOST}"
        log "       check 'docker logs wpe-ollama' for clues"
        exit 1
      fi
      if (( i % 5 == 0 )); then
        log "still waiting (${i}/120s)..."
      fi
      sleep 1
    done
    ;;
esac

# Build-from-Modelfile takes precedence over public-tag pull.
if [[ -n "${MODELFILE_PATH}" && -f "${MODELFILE_PATH}" ]]; then
  log "building ${MODEL_NAME} from ${MODELFILE_PATH}"
  # Streaming JSON response; tee to stderr so a slow build still
  # produces visible progress.
  curl -fsS -X POST "http://${OLLAMA_HOST}/api/create" \
    -H 'content-type: application/json' \
    -d "{\"name\":\"${MODEL_NAME}\",\"modelfile\":$(cat "${MODELFILE_PATH}" | jq -Rs .)}" \
    | tee /dev/stderr >/dev/null
  log "build complete"
else
  # Check if already loaded.
  if curl -fsS "http://${OLLAMA_HOST}/api/tags" \
       | jq -r '.models[].name' \
       | grep -qx "${MODEL_NAME}"; then
    log "model ${MODEL_NAME} already present, skipping pull"
    exit 0
  fi
  log "pulling ${MODEL_NAME}"
  curl -fsS -X POST "http://${OLLAMA_HOST}/api/pull" \
    -H 'content-type: application/json' \
    -d "{\"name\":\"${MODEL_NAME}\"}" \
    | tee /dev/stderr >/dev/null
  log "pull complete"
fi

# Warm — keeps the model resident so the first user request is fast.
log "warming ${MODEL_NAME}"
curl -fsS "http://${OLLAMA_HOST}/api/chat" \
  -H 'content-type: application/json' \
  -d "{\"model\":\"${MODEL_NAME}\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"stream\":false}" \
  >/dev/null || log "warm call failed (non-fatal)"

log "done"
