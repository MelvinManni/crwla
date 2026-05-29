# web-page-extractor-llm

Specialized LLM service for structured-data extraction from web pages.
Runs a quantized open-source model (Qwen 2.5 7B Q4_K_M by default) via
Ollama, wrapped in a FastAPI service with few-shot retrieval from
pgvector. Designed to deploy as a single container on Railway.

```
   POST /extract { url, goal, schema }
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │  cache lookup  →  fetch  →  retrieve K-shot │
  │      ↓                          ↓           │
  │   (hit: return)               LLM extract   │
  │                                 ↓           │
  │                            validate + retry │
  │                                 ↓           │
  │                              persist        │
  └─────────────────────────────────────────────┘
```

---

## The contract (don't change this prompt without re-training)

```
You read web pages and extract structured data.

Given HTML (or extracted text) and a goal that includes a JSON schema,
return ONLY a JSON object matching the schema. Use only facts present
on the page; null any field you cannot verify; never invent values.
If prior example outputs from the same site are attached, mirror
their shape. No prose, no markdown fences — JSON only.
```

The exact string lives in `src/prompts.py`. Every training row uses
it as the system turn, and `start.sh` bakes it into the Ollama
Modelfile so even raw `/v1/chat/completions` calls without a system
message still get the contract.

---

## Architecture (two containers)

Ollama runs in its **own container**, not bundled into the FastAPI
image. Two containers, one bridge network:

```
   ┌──────────────────┐         ┌──────────────────┐
   │  app (FastAPI)   │ ──HTTP→ │  ollama          │
   │  port 8000       │         │  port 11434      │
   │  ~600 MB image   │         │  ollama/ollama   │
   └──────────────────┘         └──────────────────┘
                                          │
                                          ▼
                                  ┌────────────────┐
                                  │ ollama-models  │
                                  │ named volume   │
                                  │ (caches GGUFs) │
                                  └────────────────┘
```

Why? The Ollama runtime is ~1.5 GB on arm64. Bundling it via `curl |
sh` during `docker build` is a single long-lived HTTPS connection that
dies on any network blip. Pulling `ollama/ollama` as its own image
uses Docker's chunked + resumable layer protocol and survives flaky
networks. Same shape on Railway: deploy two services.

## Local dev

All commands run from the **repo root**. Wrapper scripts live in the
root `package.json` so you don't need to remember the per-app cd.

### Option A — full stack via docker-compose (recommended)

Self-contained. Compose brings up Postgres + pgvector + Ollama +
FastAPI on a shared bridge network, runs the schema migration
once, then starts serving. No `.env` required for the default
zero-config experience.

```bash
# 1. Build the slim FastAPI image (Ollama image is pulled, not built)
npm run llm:docker:build

# 2. Boot the stack (foreground, follows logs)
#    Order: postgres → migrate (one-shot) → ollama → app
npm run llm:docker:run

# 3. (one-time per fresh Ollama volume) load the model into Ollama
npm run llm:ollama:load                 # pulls qwen2.5:7b-instruct-q4_K_M
```

Sanity in another shell:

```bash
npm run llm:health                      # GET /ready — pings ollama + postgres
```

Stop everything (named volumes persist data + model across restarts):

```bash
npm run llm:docker:down
```

If you want to override defaults (e.g. set `API_TOKEN`, swap to a
fine-tuned model tag, point at an external Postgres), copy
`apps/web-page-extractor-llm/.env.example` to `.env` and uncomment the
lines you need — compose merges `.env` on top of its built-in
defaults, with explicit `environment:` entries winning ties.

### Option B — uvicorn against host's Ollama (fastest iteration)

For active development on the workflow / nodes / validator. Faster
than rebuilding the Docker image on every change.

```bash
# 1. Postgres + pgvector locally (as above)
# 2. Schema
npm run llm:migrate

# 3. Ollama on the host (macOS: brew install ollama)
ollama serve &
ollama pull qwen2.5:7b-instruct-q4_K_M

# 4. Python deps + Playwright chromium (one-time)
npm run llm:install                     # creates apps/web-page-extractor-llm/.venv

# 5. Hot-reload uvicorn
OLLAMA_HOST=127.0.0.1:11434 npm run llm:dev
```

Sanity:

```bash
npm run llm:health                      # curl /ready
curl localhost:8000/ready
curl -X POST localhost:8000/extract \
  -H 'content-type: application/json' \
  -d '{
    "url": "https://www.apple.com/shop/buy-iphone/iphone-15-pro",
    "goal": "Extract the product listing.",
    "schema": {
      "type": "object",
      "properties": {
        "title":    {"type": "string"},
        "price":    {"type": "number"},
        "currency": {"type": "string"},
        "image":    {"type": ["string", "null"]}
      },
      "required": ["title", "price", "currency"]
    }
  }'
```

---

## Fine-tuning

The default Ollama tag is good enough to validate the pipeline, but the
quality jump after fine-tuning is substantial. Three steps:

### 1. Generate training data

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python training/synthetic_data_generator.py \
  --seeds  training/seeds.yaml \
  --out    training/data/train.jsonl \
  --target 2000
```

Each row uses the exact system prompt + user-message shape the inference
service uses, so train-time and serve-time are byte-identical.

### 2. QLoRA fine-tune (Axolotl or Unsloth)

On a single GPU (A100 / RTX 4090 / Colab Pro / RunPod):

```bash
# Option A — Axolotl
pip install axolotl[deepspeed]
accelerate launch -m axolotl.cli.train training/axolotl_qlora.yaml
accelerate launch -m axolotl.cli.merge_lora training/axolotl_qlora.yaml

# Option B — Unsloth single-file
pip install unsloth trl datasets bitsandbytes
python training/unsloth_train.py \
  --data   training/data/train.jsonl \
  --output training/output \
  --epochs 3
```

Expect ~30 min per epoch on 2K examples × 8K seqlen on an A100.

### 3. Convert to GGUF + build Ollama Modelfile

```bash
# llama.cpp (one-time)
git clone https://github.com/ggerganov/llama.cpp vendor/llama.cpp
make -C vendor/llama.cpp -j

# Convert + quantize
./training/convert_to_gguf.sh
# → training/output/web-page-extractor-llm.Q4_K_M.gguf
# → training/output/Modelfile (already references the gguf + locks the
#                              system prompt)
```

---

## Railway deployment

Same two-container shape as docker-compose, one Railway project with
**two services**:

| Service       | Image / source                  | Purpose                          |
| ------------- | ------------------------------- | -------------------------------- |
| `ollama`      | Docker image `ollama/ollama`    | Hosts the GGUF on a volume       |
| `app`         | This repo's `Dockerfile`        | FastAPI workflow + retrieval     |
| `postgres`    | Railway Postgres plugin         | Cache + pgvector example corpus  |

### One-time: project setup

1. **Create the Railway project**, add a **Postgres** plugin (pgvector
   is preinstalled on Railway's image).
2. **Add the `ollama` service** — "New Service → Empty Service →
   Settings → Source → Docker Image → `ollama/ollama:0.4.7`". Attach
   a volume mounted at `/root/.ollama` (~10–20 GB). Set env vars:
   ```
   OLLAMA_KEEP_ALIVE=24h
   OLLAMA_NUM_PARALLEL=1
   OLLAMA_FLASH_ATTENTION=1
   ```
3. **Add the `app` service** from this repo:
   - Set **Root Directory** to `apps/web-page-extractor-llm`. The
     `railway.json` lives there and its `dockerfilePath` is relative
     to that root.
   - Env vars:
     ```
     OLLAMA_HOST=ollama.railway.internal:11434
     MODEL_NAME=qwen2.5:7b-instruct-q4_K_M
     DATABASE_URL=${{ Postgres.DATABASE_URL }}
     MAX_PAGE_TOKENS=24000
     API_TOKEN=<random>                  # optional, enables Bearer auth
     ```
4. **Run the migration** from your laptop (or via Railway CLI):
   ```bash
   npm run llm:migrate                  # psql $DATABASE_URL -f .../001_init.sql
   # or
   railway run npm run llm:migrate
   ```
5. **Load the model** into the Ollama service's volume (one-time per
   fresh volume):
   ```bash
   railway run --service ollama npm run llm:ollama:load
   ```

### Shipping your fine-tuned GGUF

Once you've built `training/output/web-page-extractor-llm.Q4_K_M.gguf`:

1. Upload the GGUF to the Ollama service's volume (Railway CLI:
   `railway ssh` into the ollama service, `scp` the file, or use a
   bucket and pull from there).
2. Set `MODELFILE_PATH=/root/.ollama/Modelfile` and
   `MODEL_NAME=web-page-extractor-llm:latest` on the `app` service.
3. Run `npm run llm:ollama:load` — `load_model.sh` POSTs the Modelfile
   to `/api/create` and the new tag becomes available.

### Plan sizing

| Service | Plan | Why |
|---|---|---|
| `ollama` | 16 GB / 4 vCPU (7B Q4_K_M) or 32 GB (14B) | Model RAM + KV cache |
| `app` | 1 GB / 1 vCPU | Stateless, embedding model fits in 500 MB |
| `postgres` | Starter is fine until ~100K extractions | pgvector ivfflat is cheap |

Cold start: ~2–4 min for first model download into the Ollama volume,
~20–40 s on restart.

### Health checks

- `/health` — liveness, no dependencies
- `/ready` — readiness, pings Ollama + Postgres

`railway.json` points `healthcheckPath` at `/health` with a 180 s
start-period so cold starts don't kill the deploy.

---

## API

### `POST /extract` (opinionated)

```json
{
  "url": "https://...",
  "goal": "Extract the product listing on this page.",
  "schema": { "type": "object", "properties": {...}, "required": [...] },
  "bucket": "amazon.com",
  "force": false
}
```

Returns:

```json
{
  "output": { "title": "...", "price": 1199, "currency": "USD" },
  "cached": false,
  "model": "qwen2.5:7b-instruct-q4_K_M",
  "tokens_in": 8421,
  "tokens_out": 86,
  "latency_ms": 1832,
  "confidence": 1.0,
  "few_shot_used": [{ "bucket": "amazon.com", "similarity": 0.87 }],
  "validation_attempts": []
}
```

`output` is `null` only when every validation retry failed — check
`validation_attempts` for why.

### `POST /v1/chat/completions` (OpenAI-compatible)

For tools that already speak that protocol. We always force the locked
system prompt; the caller-supplied system message is discarded.

---

## Tuning + scaling

- **Memory**: `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1` in
  the Dockerfile keep RAM predictable. Bump only if your plan allows.
- **Concurrency**: FastAPI runs `--workers 1` so the embedder + DB pool
  are shared. For >1 req/s, run multiple Railway replicas behind their
  built-in load balancer rather than threading inside a worker.
- **Cost**: each cache hit is ~5 ms (one indexed lookup + JSON
  decode). Cache hit-rate at the same retailer + same schema typically
  hits 60–80% in steady state. Persist aggressively.
- **Switch models without redeploying**: change `MODEL_NAME` env →
  restart. Ollama caches everything on the volume.

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `/ready` shows `ollama: connection refused` for >2 min | Model still downloading on first cold start. Tail Ollama logs. |
| `output: null`, attempts include "Schema violation" | Model lacks examples for this schema variant. Promote a known-good extraction into `examples` via `scripts/seed_examples.py`. |
| `output: null`, attempts include "JSON parse error" | Try setting `ALWAYS_RENDER_JS=true` — the page is probably SPA-rendered. |
| OOM kills the container | Either drop to a smaller model (`qwen2.5:3b-instruct-q4_K_M`) or bump Railway RAM to 32 GB. |
| Cold start downloads model every restart | Volume isn't mounted at `/root/.ollama`. Re-attach the Railway volume. |

---

## Layout

```
src/
  main.py                  # FastAPI lifespan + health
  config.py                # pydantic-settings env loading
  prompts.py               # the 80-token system prompt (verbatim)
  schemas.py               # request/response Pydantic models
  api/routes.py            # /extract + /v1/chat/completions
  agent/workflow.py        # LangGraph pipeline
  agent/nodes.py           # fetch/retrieve/extract/validate/persist
  agent/retriever.py       # pgvector cosine search
  agent/validator.py       # jsonschema + corrective retry
  llm/client.py            # Ollama /api/chat client
  fetcher/{http,playwright}.py
  db/{connection,repositories}.py
  utils/{html,hashing,embeddings}.py

training/
  axolotl_qlora.yaml       # QLoRA config
  unsloth_train.py         # single-file alternative
  synthetic_data_generator.py
  convert_to_gguf.sh
  seeds.yaml

db/migrations/001_init.sql
scripts/{start.sh, seed_examples.py}
Dockerfile, railway.json, requirements.txt
```
