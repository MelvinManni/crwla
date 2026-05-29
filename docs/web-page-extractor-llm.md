# web-page-extractor-llm — end-to-end

A specialized open-source LLM service for extracting structured JSON
from arbitrary web pages. Runs on Railway. Single Docker image bundles
Ollama (inference) + FastAPI (the workflow), backed by Postgres +
pgvector (cache + few-shot corpus).

```
   📥  Web page (URL or HTML)        📤  Validated JSON matching schema
       │                                 ▲
       ▼                                 │
   ┌────────────────────────────────────────────┐
   │   fetch → retrieve K-shot → LLM extract    │
   │   → validate + retry → persist + learn     │
   └────────────────────────────────────────────┘
                       │
                       ▼
                ┌────────────┐    ┌──────────────┐
                │  🧠 Ollama │    │  🗄️ pgvector │
                │  (Qwen 7B) │    │  cache + KB  │
                └────────────┘    └──────────────┘
```

---

## 1. The fixed contract 📜

Every call uses this 80-token system prompt. **The fine-tuned model is
trained against this exact string** — changing it breaks the contract.
It lives once in `src/prompts.py` and is baked into the Ollama
Modelfile too, so any caller — including `/v1/chat/completions` ones
who forget to set a system message — gets the same guarantee.

```
You read web pages and extract structured data.

Given HTML (or extracted text) and a goal that includes a JSON schema,
return ONLY a JSON object matching the schema. Use only facts present
on the page; null any field you cannot verify; never invent values.
If prior example outputs from the same site are attached, mirror
their shape. No prose, no markdown fences — JSON only.
```

Three guarantees we rely on:

1. **Schema-only output** — never prose, never markdown fences
2. **No invention** — unverifiable fields return `null`
3. **Mirror prior examples** — the few-shot priming has teeth

---

## 2. End-to-end architecture

```mermaid
flowchart TD
    subgraph Build["🏗️  BUILD PIPELINE (one-time, then on schema drift)"]
        Seeds[training/seeds.yaml<br/>URL + goal + schema list]
        Seeds --> Gen[synthetic_data_generator.py<br/>uses Claude as teacher<br/>against the locked SYSTEM_PROMPT]
        Gen --> JSONL[(train.jsonl<br/>ShareGPT format)]
        JSONL --> Train["QLoRA fine-tune<br/>(Axolotl YAML or Unsloth)<br/>base: Qwen 2.5 7B Instruct"]
        Train --> Merge[merge_lora]
        Merge --> GGUF[convert_to_gguf.sh<br/>HF → Q4_K_M]
        GGUF --> MF[Modelfile<br/>locks SYSTEM_PROMPT + params]
        MF --> Image[Docker image<br/>baked GGUF + Modelfile]
    end

    subgraph Serve["🚀  INFERENCE PIPELINE (every request)"]
        Req[POST /extract<br/>url + goal + schema]
        Req --> Cache{cache lookup<br/>url_hash + goal_hash + model}
        Cache -->|✅ hit| Resp[(return cached JSON,<br/>~5 ms)]
        Cache -->|❌ miss| Fetch[fetch HTML<br/>httpx → playwright fallback]
        Fetch --> Strip[strip scripts/styles<br/>truncate to MAX_PAGE_TOKENS]
        Strip --> Retrieve[pgvector cosine search<br/>k=2 examples per bucket]
        Retrieve --> Call[Ollama /api/chat<br/>format=json, temp=0.1]
        Call --> Validate{jsonschema validate}
        Validate -->|❌ fail| Retry[corrective re-prompt<br/>max N retries]
        Retry --> Validate
        Validate -->|✅ pass| Persist[INSERT extractions<br/>+ embedding]
        Persist --> Resp2[(return JSON +<br/>diagnostics)]
    end

    Image -.deploys to.-> Ollama[🧠 Ollama daemon]
    Ollama -.serves.-> Call
    Persist -.builds learned corpus.-> Retrieve
```

---

## 3. The build pipeline (training)

How we turn the locked prompt + a list of URLs into a fine-tuned
GGUF that ships in the container.

### 3a. Synthetic data generation

```mermaid
sequenceDiagram
    autonumber
    participant Dev as Developer
    participant Gen as synthetic_data_generator.py
    participant Fetch as fetcher.http
    participant Strip as utils.html
    participant Claude as Claude (teacher, sonnet-4-6)
    participant Out as train.jsonl

    Dev->>Gen: python ... --seeds seeds.yaml --target 2000
    loop for each seed (concurrency=8)
        Gen->>Fetch: fetch_html(seed.url)
        Fetch-->>Gen: html
        Gen->>Strip: html_to_text + truncate
        Strip-->>Gen: page_text
        Gen->>Claude: SYSTEM_PROMPT + (goal + schema + page)
        Claude-->>Gen: canonical JSON
        Gen->>Out: write ShareGPT row<br/>{ system, human (goal+schema+page), gpt (JSON) }
    end
```

Why Claude as teacher? It's strong enough to produce reference JSON
even on weird retailer pages, and using the **same system prompt +
user-message layout** that the student model will see at serve time
means train ≡ serve byte-for-byte. No prompt drift, no train-test gap.

Each ShareGPT row looks like:

```json
{
  "conversations": [
    {"from": "system", "value": "<SYSTEM_PROMPT verbatim>"},
    {"from": "human",  "value": "GOAL: ...\n\nSCHEMA: {...}\n\nPAGE: ..."},
    {"from": "gpt",    "value": "{\"title\": ..., \"price\": ...}"}
  ]
}
```

### 3b. QLoRA fine-tune

```mermaid
flowchart LR
    Base["Qwen 2.5 7B Instruct<br/>(HF Hub)"]
    Q4["bitsandbytes 4-bit NF4<br/>load_in_4bit + double quant"]
    Base --> Q4
    Q4 --> LoRA["LoRA adapter<br/>r=32, α=64<br/>all linear layers"]
    Train2["train.jsonl<br/>(ShareGPT, ChatML)"]
    Train2 --> SFT[SFTTrainer]
    LoRA --> SFT
    SFT --> Checkpoints[adapter checkpoints<br/>training/output/]
    Checkpoints --> Merge2["merge_lora<br/>→ FP16 merged model"]
```

Key configs (`training/axolotl_qlora.yaml`):

- `sequence_len: 8192` — fits big product pages + the JSON output
- `sample_packing: true` — boost effective batch size on the GPU
- `train_on_inputs: false` — loss only on the assistant turn, so the
  HTML doesn't dominate the gradient
- `lora_target_linear: true` — generalises better than Q/V-only LoRA
- 3 epochs × 2K examples on a single A100 ≈ 1.5 h

Swap to Unsloth (`training/unsloth_train.py`) if you want a faster
single-file run with the same hyperparameters.

### 3c. Quantization + Ollama packaging

```mermaid
flowchart TD
    Merged[training/output/merged/<br/>FP16 HF model]
    Merged --> Conv["llama.cpp convert_hf_to_gguf.py<br/>--outtype f16"]
    Conv --> FP16[web-page-extractor-llm.fp16.gguf<br/>~14 GB]
    FP16 --> Quant["llama-quantize → Q4_K_M"]
    Quant --> Q4Final[web-page-extractor-llm.Q4_K_M.gguf<br/>~4.4 GB]
    Q4Final --> MF2["Modelfile<br/>FROM ./gguf<br/>SYSTEM <80-token prompt><br/>PARAMETER temperature 0.1<br/>PARAMETER num_ctx 32768"]
    MF2 --> Image2[bake into Docker context<br/>scripts/Modelfile + scripts/*.gguf]
```

Quantization choice:

| Quant | Size (7B) | RAM (16K ctx) | Quality |
|---|---|---|---|
| Q4_K_M | 4.4 GB | ~6 GB | **default — best balance** |
| Q5_K_M | 5.1 GB | ~7 GB | slight quality bump |
| Q6_K | 5.9 GB | ~8 GB | near-FP16 |

The Modelfile pins the system prompt at the model layer so the
contract holds even when callers bypass our FastAPI service.

---

## 4. The inference pipeline (request)

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as FastAPI /extract
    participant WF as workflow.run_extraction
    participant Repo as ExtractionsRepo
    participant Fetch as fetcher
    participant Retr as retriever (pgvector)
    participant LLM as OllamaClient
    participant Val as validator

    Client->>API: POST /extract { url, goal, schema }
    API->>WF: run_extraction(req)

    WF->>Repo: lookup(url_hash, goal_hash, model)
    alt cache hit
        Repo-->>WF: cached output
        WF-->>API: { output, cached: true, latency ~5 ms }
        API-->>Client: 200
    else cache miss
        WF->>Fetch: fetch (http → playwright fallback)
        Fetch-->>WF: page_text (truncated)
        WF->>Retr: cosine search (bucket, embedding, k=2)
        Retr-->>WF: few-shot examples
        WF->>LLM: chat(SYSTEM_PROMPT, user(goal+schema+examples+page))
        LLM-->>WF: raw output

        loop validate + retry (max N)
            WF->>Val: parse + jsonschema validate
            alt valid
                Val-->>WF: parsed JSON + confidence
            else invalid
                Val->>LLM: corrective re-prompt
                LLM-->>Val: retry output
            end
        end

        WF->>Repo: INSERT extraction + embedding
        WF-->>API: { output, cached: false, tokens, confidence, few_shot_used, validation_attempts }
        API-->>Client: 200
    end
```

### 4a. The five workflow nodes (LangGraph)

```mermaid
flowchart LR
    START([START]) --> F[fetch_node]
    F --> R[retrieve_node]
    R --> E[extract_node]
    E --> V[validate_node]
    V --> P[persist_node]
    P --> END([END])

    F -.html → text → token-budgeted page_text.-> F
    R -.embed query, ANN search bucket.-> R
    E -.single Ollama call,<br/>SYSTEM_PROMPT locked.-> E
    V -.parse JSON,<br/>jsonschema validate,<br/>up to N corrective retries.-> V
    P -.write extraction +<br/>embedding for future few-shot.-> P
```

Each node is a plain async function — testable standalone, swappable
without touching the others. LangGraph is the orchestrator; the same
five functions chain cleanly without it if needed.

### 4b. Fetcher escalation

```mermaid
flowchart TD
    URL[URL]
    URL --> Static["httpx GET (15s)<br/>follow redirects"]
    Static --> Strip2[html_to_text<br/>selectolax: drop scripts/styles/iframes/svg]
    Strip2 --> Check{len ≥ 400 chars?}
    Check -->|✅| Trunc[truncate to MAX_PAGE_TOKENS]
    Check -->|❌ SPA suspected| PW[playwright chromium<br/>headless, waitForLoadState]
    PW --> Strip3[html_to_text]
    Strip3 --> Trunc
    Trunc --> Out[page_text → next node]
```

Cheap path first. ~95% of retailer product pages ship JSON-LD + OG
server-side, so they never need Chromium. Set `ALWAYS_RENDER_JS=true`
to force the heavy path on every request.

### 4c. Few-shot retrieval

```mermaid
flowchart TD
    Goal[goal + page_text head]
    Goal --> Embed["sentence-transformers<br/>BAAI/bge-small-en-v1.5<br/>→ 384-d vector"]
    Embed --> Q[pgvector cosine query]

    Q --> A["examples (curated, active=true)<br/>WHERE bucket=$1<br/>ORDER BY embedding <=> $vec"]
    Q --> B["extractions (learned, confidence ≥ 0.8)<br/>WHERE url LIKE '%bucket%'<br/>ORDER BY embedding <=> $vec"]

    A --> Union[union, sort by similarity desc]
    B --> Union
    Union --> Filter{similarity ≥ FEW_SHOT_MIN_SIM?}
    Filter -->|✅| Take[take top K]
    Filter -->|❌| Drop[(skip)]
    Take --> Prompt[inject as EXAMPLES block<br/>in the user message]
```

Two-tier source:

| Tier | Source | Quality | Volume |
|---|---|---|---|
| **Curated** | `examples` table, reviewer-blessed | Highest | Small |
| **Learned** | `extractions` with `confidence ≥ 0.8` | Good | Grows over time |

The corpus self-improves: every successful extraction becomes a future
few-shot candidate for the same retailer.

### 4d. Validator + corrective retry

```mermaid
flowchart TD
    Raw[raw LLM output]
    Raw --> Strip4["strip ```json fences<br/>(common cleanup, no re-prompt cost)"]
    Strip4 --> Parse{json.loads}
    Parse -->|❌ syntax error| Salvage["best-effort:<br/>find first balanced {…}"]
    Parse -->|✅| TypeCheck{top-level dict?}
    Salvage -->|✅| TypeCheck
    Salvage -->|❌| Err1[error: JSON parse]

    TypeCheck -->|❌| Err2[error: must be object]
    TypeCheck -->|✅| Schema{jsonschema validate}
    Schema -->|❌| Err3[error: schema violation at <path>]
    Schema -->|✅| Out2[parsed dict + confidence 1.0]

    Err1 --> Decide{retries left?}
    Err2 --> Decide
    Err3 --> Decide

    Decide -->|✅| Repair["corrective re-prompt:<br/>previous output + error<br/>'JSON only'"]
    Repair --> Raw

    Decide -->|❌| LastDitch[best-effort salvage]
    LastDitch -->|some JSON| Out3[parsed + confidence 0.25]
    LastDitch -->|nothing| Out4[null + confidence 0]
```

Confidence shrinks with each retry: `1.0 → 0.8 → 0.6 → 0.25 (salvaged) → 0 (gave up)`.
Callers see this number and can decide what to do — typically `< 0.5`
rows aren't promoted into the example corpus.

### 4e. Persistence + the learning loop

```mermaid
flowchart LR
    Parsed[validated JSON]
    Parsed --> Embed2["embed(goal + page head)"]
    Embed2 --> Insert[INSERT extractions<br/>ON CONFLICT cache_key DO UPDATE]
    Insert --> DB[(extractions table)]

    DB -.high-confidence rows<br/>become few-shot candidates.-> Next[next request's retrieve_node]

    Admin[👤 Admin / curator] -.promotes select rows to.-> Examples[(examples table)]
    Examples -.served as<br/>'curated' tier.-> Next
```

The cache key `(url_hash, goal_hash, model)` makes re-extractions
free, while the `embedding` column makes every past extraction
discoverable as a future few-shot example. The system gets smarter at
each retailer over time without changing the model weights.

---

## 5. Data model

```mermaid
erDiagram
    EXTRACTIONS ||--o{ EXAMPLES : "promoted from"
    EXTRACTIONS {
        UUID id PK
        char(16) url_hash UK "part of cache key"
        char(16) goal_hash UK "part of cache key"
        text url
        text goal
        jsonb schema
        text model UK "part of cache key"
        jsonb output "validated JSON"
        int tokens_in
        int tokens_out
        int latency_ms
        real confidence "0..1"
        vector(384) embedding "for retrieval"
        timestamptz created_at
    }
    EXAMPLES {
        UUID id PK
        text bucket "scope: hostname or schema name"
        text url
        text goal
        jsonb schema
        jsonb output "canonical reviewer-blessed"
        text notes "human-only"
        vector(384) embedding
        bool active "pause without delete"
    }
```

Indexes:

- `UNIQUE (url_hash, goal_hash, model)` on extractions — the cache key.
- `ivfflat (embedding vector_cosine_ops)` on both tables — ANN
  retrieval. Tune `lists` to `sqrt(rowcount)` once you're past a
  few thousand rows.
- Partial index on `examples (bucket) WHERE active` — fast per-bucket
  scope without filtering inactive rows.

---

## 6. Deployment topology

Two containers, never one. Bundling Ollama into the FastAPI image made
builds fragile (the ~1.5 GB upstream tarball is a single long-lived
curl that dies on any network blip). Splitting them lets `docker pull`
chunk + resume the Ollama image layers, and lets each container have
one responsibility.

```mermaid
flowchart TB
    subgraph Railway["☁️  Railway project: web-page-extractor-llm"]
        direction TB

        subgraph AppSvc["🐳 Service: app"]
            direction TB
            Tini[tini PID 1]
            Tini --> Start[start.sh]
            Start --> Uvicorn["uvicorn src.main:app<br/>foreground, $PORT"]
        end

        subgraph OllamaSvc["🐳 Service: ollama<br/>(image: ollama/ollama:0.4.7)"]
            direction TB
            OllamaD[ollama serve<br/>port 11434]
            OllamaD -.OLLAMA_KEEP_ALIVE=24h<br/>NUM_PARALLEL=1.-> Model[Qwen 7B Q4_K_M<br/>or fine-tuned tag]
        end

        Vol[(💾 Railway volume<br/>/root/.ollama<br/>on the ollama service<br/>caches the GGUF)]
        OllamaSvc -.persists across restarts.-> Vol

        PG[(🐘 Railway Postgres<br/>+ pgvector ext)]
        Uvicorn -.asyncpg pool.-> PG
        Uvicorn -->|"ollama.railway.internal:11434"| OllamaD
    end

    Client2[Caller<br/>e.g. CRWLA pricing crawler] -->|HTTPS| Uvicorn

    Load[load_model.sh<br/>npm run llm:ollama:load]
    Load -.one-time per volume:<br/>POST /api/pull or /api/create.-> OllamaD
```

Key choices:

- **Separate Ollama service**: `docker pull ollama/ollama` uses chunked
  + resumable layer protocol; surviving flaky networks is built in.
  The Ollama image is also pre-warmed by upstream — no `apt-get` /
  `curl` install dance at build time.
- **`app` service is small (~600 MB)**: just Python + FastAPI + sentence-
  transformers + Playwright chromium. Boots in seconds. Cheap to scale
  horizontally — they're stateless apart from the DB pool.
- **Volume at `/root/.ollama` on the OLLAMA service**: the 4–8 GB GGUF
  survives container restarts. First boot: ~2–4 min download. After:
  ~5 s.
- **Model loading is out-of-band**: `scripts/load_model.sh` POSTs to
  `/api/pull` (public tag) or `/api/create` (local Modelfile) once per
  fresh Ollama volume. `start.sh` no longer manages it.
- **Postgres as a separate Railway plugin**: connected via
  `DATABASE_URL` env, pgvector preinstalled.
- **`/health` for liveness, `/ready` for readiness** — Railway
  health-checks `/health` with a 180 s start period. `/ready` pings
  Ollama + Postgres to confirm both dependencies are reachable.

### Local-dev parity

`apps/web-page-extractor-llm/docker-compose.yml` mirrors the production
shape: an `ollama` service + an `app` service on a shared bridge
network, with the same `ollama:11434` hostname so `OLLAMA_HOST` doesn't
have to change between dev and prod.

### Resource sizing

| Model | RAM (16K ctx) | Plan |
|---|---|---|
| Qwen 2.5 7B Q4_K_M | ~6 GB | **16 GB / 4 vCPU** ← default |
| Qwen 2.5 7B Q5_K_M | ~7 GB | 16 GB / 4 vCPU |
| Qwen 2.5 14B Q4_K_M | ~10 GB | 32 GB / 8 vCPU |
| Qwen 2.5 3B Q4_K_M | ~3 GB | 8 GB / 2 vCPU (downgrade option) |

---

## 7. The full lifecycle on one page

```mermaid
flowchart LR
    subgraph One["1️⃣ BUILD (one-off)"]
        direction TB
        S1[seeds.yaml] --> S2[generate train.jsonl<br/>Claude as teacher]
        S2 --> S3[QLoRA fine-tune<br/>Qwen 2.5 7B]
        S3 --> S4[merge + GGUF Q4_K_M]
        S4 --> S5[Modelfile w/ SYSTEM_PROMPT]
        S5 --> S6[bake into Docker image]
    end

    subgraph Two["2️⃣ DEPLOY"]
        direction TB
        D1[railway up app + add ollama service] --> D2[volume mounts /root/.ollama<br/>on the ollama service]
        D2 --> D3[ollama serve in container 1]
        D3 --> D4[load_model.sh POSTs<br/>/api/pull or /api/create]
        D4 --> D5[uvicorn in container 2 serves on $PORT,<br/>OLLAMA_HOST=ollama.railway.internal:11434]
    end

    subgraph Three["3️⃣ SERVE (per request)"]
        direction TB
        R1[POST /extract] --> R2[cache lookup]
        R2 --> R3{hit?}
        R3 -->|yes| R4[return cached]
        R3 -->|no| R5[fetch + retrieve + LLM + validate]
        R5 --> R6[persist + return]
        R6 -.embedding.-> R7[future few-shot pool grows]
    end

    subgraph Four["4️⃣ IMPROVE"]
        direction TB
        I1[curator reviews extractions] --> I2[promote good ones<br/>to examples table]
        I2 --> I3[seed_examples.py inserts<br/>with fresh embedding]
        I3 --> I4[next request's retriever<br/>picks them as few-shot]
    end

    One --> Two
    Two --> Three
    Three -.audit log.-> Four
    Four -.tightens future outputs.-> Three
```

---

## 8. Operations

### Anti-hallucination defences (layered)

| Layer | What | When it fires |
|---|---|---|
| SYSTEM prompt | "never invent values" | Every call |
| Modelfile SYSTEM | Same string baked in Ollama | Every call (even raw chat API) |
| `format: "json"` in Ollama options | Forces parseable JSON at the sampler | Every call |
| `temperature: 0.1` + `top_p: 0.9` | Low-variance decoding | Every call |
| Fine-tune contract | Model memorised the schema-only shape | Every call (with fine-tuned tag) |
| Few-shot priming | Examples show "this is what null looks like" | When examples cosine ≥ 0.55 |
| jsonschema validator | Reject anything off-spec | After every call |
| Corrective retry | Re-prompt with the validator error | Up to N retries |
| Best-effort salvage | Extract first balanced `{…}` from prose | When all retries fail |

### Debugging a bad output

1. Look at `validation_attempts` in the response. Empty = model produced
   valid JSON first try. Non-empty = each retry's error.
2. Look at `few_shot_used`. Empty means the retriever found nothing
   above threshold for this bucket — the curated corpus is sparse.
3. Look at `confidence`. Below `0.5` → either a salvaged output or
   no examples available. Not safe to cache long-term.
4. Pull the row from `extractions` by `url + goal` and inspect the
   `output` JSON manually. Promote to `examples` if it's actually
   correct; the model just needed an example.

### Scaling

- **Concurrency**: `--workers 1` per replica (shared embedder + DB
  pool). For higher RPS, scale replicas in `railway.json`.
- **Cache hit rate**: typically 60–80% in steady state when the same
  retailer + schema combo gets queried repeatedly. Each hit ≈ 5 ms
  (single indexed lookup + JSON decode).
- **Model swap**: change `MODEL_NAME` env → restart. Cache rows
  invalidate per-model so no cross-contamination.

### Tightening for production

- Set `API_TOKEN` env to require Bearer auth on both routes.
- Bump ivfflat `lists` to `√(rowcount)` once the corpus passes 10K rows.
- Promote the top 5–10% of `extractions` per bucket to `examples`
  monthly so the curated tier stays meaningful.
- Run `VACUUM ANALYZE extractions` weekly if you turn caching off
  (frequent updates without inserts → bloat).

---

## 9. Source-of-truth reference

| What | Where |
|---|---|
| The locked system prompt | `apps/web-page-extractor-llm/src/prompts.py` |
| Cache key derivation | `src/utils/hashing.py` (`url_hash`, `goal_hash`) |
| Workflow nodes | `src/agent/nodes.py` |
| Cache lookup query | `src/db/repositories.py::ExtractionsRepo.lookup` |
| Few-shot retrieval SQL | `src/agent/retriever.py` |
| Validation + retry policy | `src/agent/validator.py` |
| Training config | `training/axolotl_qlora.yaml` |
| Data generator | `training/synthetic_data_generator.py` |
| GGUF conversion | `training/convert_to_gguf.sh` |
| Entrypoint script | `scripts/start.sh` |
| Docker / Railway | `Dockerfile`, `railway.json` |
| Schema | `db/migrations/001_init.sql` |
