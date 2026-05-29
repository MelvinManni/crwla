# Pricing Crawla & Job Search

Two new feature modules for CRWLA. Both are Starter+ subscription features, both share the same plan-gating + recent-searches + delete UX, and both follow the same backend pipeline shape.

```
 ┌──────────────────────────┐        ┌──────────────────────────┐
 │   💰  Pricing Crawla     │        │   💼  Job Search         │
 │                          │        │                          │
 │   Search → Results       │        │   Search → Results       │
 │      ↓                   │        │                          │
 │   Product detail         │        │   Admin: 🏢 Tracked      │
 │                          │        │   companies (CRUD)       │
 └──────────────────────────┘        └──────────────────────────┘
            │                                       │
            └───────────────┬───────────────────────┘
                            ▼
            ┌──────────────────────────────────┐
            │  🔒  FeatureAccessService        │
            │       (single DB-backed gate)    │
            └──────────────────────────────────┘
```

---

## 1. Pricing Crawla 💰

> Search any product, get live prices from real retailers, compare with reviews + a YouTube unboxing.

### 1a. User journey

```mermaid
flowchart LR
    A[/pricing-crawla<br/>Search + recent list/]
    B[/pricing-crawla/:id<br/>Results page/]
    C[/pricing-crawla/result/:id<br/>Product detail/]

    A -- submit query --> B
    A -- click recent card --> B
    A -- click trash, ConfirmDialog --> A
    B -- click product card --> C
    B -- Delete button --> A
    C -- Back to results --> B
    C -- Buy → external --> X((🛒 retailer))
```

Each box is a real Next.js route segment with its own `page.tsx` + `*-client.tsx` + `opengraph-image.tsx`.

### 1b. Backend pipeline

When the user submits a search:

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as PricingCrawlaController
    participant SVC as PricingCrawlaService
    participant FEAT as FeatureAccessService
    participant DB as Postgres
    participant Q as BullMQ<br/>(pricing-crawla queue)
    participant W as PricingCrawlaProcessor

    FE->>API: POST /pricing-crawla/search
    API->>SVC: createSearch(userId, dto)
    SVC->>FEAT: consume('pricing_crawla')
    FEAT->>DB: read plan.limits + bump usage
    FEAT-->>SVC: ok / throws PLAN_LIMIT_EXCEEDED
    SVC->>SVC: IntentService.generateIntent()
    SVC->>DB: INSERT pricing_search<br/>(status=PENDING)
    SVC->>Q: runSearch(id)
    SVC-->>API: { search }
    API-->>FE: 200 { search }
    FE->>FE: router.push(/pricing-crawla/:id)

    Note over Q,W: async — FE polls every 2s
    Q->>W: process(job)
    W->>DB: UPDATE status=RUNNING
    W->>W: fan out to adapters
    W->>DB: write results + reviews
    W->>DB: UPDATE status=COMPLETED
```

### 1c. The crawl pipeline (inside the processor)

This is the multi-stage filter that turns a query into clean rows. **Every gate that fails drops the listing** — no fake data leaks through.

```mermaid
flowchart TD
    Q[Query: 'iPhone 17 Pro']
    Q --> A["AdapterRegistry<br/>9 site-specific adapters<br/>+ 1 open-web adapter<br/>in one Promise.all fan-out"]

    A --> WSA["WebSearchAdapter per retailer<br/>site:amazon.com, site:bestbuy.com, ..."]
    A --> OWA["OpenWebSearchAdapter<br/>'<product>' buy price<br/>(no site filter)"]

    subgraph "Per-retailer pipeline"
        WSA --> WS[WebSearchService<br/>DuckDuckGo HTML]
        WS -->|raw URLs| LV{LinkValidator<br/>HEAD then GET<br/>follows redirects}
        LV -->|❌ dead/timeout| Drop1[(dropped)]
        LV -->|✅ 2xx/3xx| EX{ProductExtractor}

        EX --> JL[JSON-LD Product]
        EX --> OG[OG meta tags]
        EX --> MD[microdata]

        JL --> Merge
        OG --> Merge
        MD --> Merge[Merge: prefer JSON-LD,<br/>fill from OG, then microdata]
        Merge -->|❌ no title or price| Drop2[(dropped)]
        Merge -->|✅ both present| Lst[RawListing]
    end

    subgraph "Open-web pipeline"
        OWA --> OWS[WebSearchService<br/>broad query, 15 hits]
        OWS --> HF{Host filter}
        HF -->|❌ known retailer<br/>already covered| Drop4[(dropped)]
        HF -->|❌ non-commerce<br/>theverge, reddit, ...| Drop5[(dropped)]
        HF -->|✅| LV2{LinkValidator}
        LV2 -->|❌| Drop6[(dropped)]
        LV2 -->|✅| EX2{ProductExtractor}
        EX2 -->|❌ no product schema| Drop7[(dropped)]
        EX2 -->|✅| Lst2[RawListing<br/>storeName derived from host]
    end

    Lst --> N[CurrencyService.toUsd<br/>normalize price]
    Lst2 --> N
    N --> IV{IntentService.validate<br/>critical-token check}
    IV -->|verdict| R[RankingService.score<br/>price·trust·reviews·rating·intent]

    R --> BF{Backfill filter<br/>drop verdict=mismatch}
    BF -->|❌| Drop3[(dropped, logged<br/>to metadata)]
    BF -->|✅| Top[Top 10 by rankScore]

    Top --> Alt[Pick 3 alternatives<br/>from long tail]
    Top --> P[(pricing_result rows<br/>persisted)]
    Alt --> S[(pricing_search.alternatives<br/>JSON column)]
```

**Two channels, same refinement.** Site-specific adapters use `site:` filters so they're targeted; the **open-web adapter** runs a broad search and refines via:

1. **Known-retailer skip** — drops URLs whose host is already covered by a site-specific adapter (shared `KNOWN_RETAILER_DOMAINS` set; no double-counting).
2. **Non-commerce blocklist** — drops obvious news/review/social hosts (wikipedia, theverge, reddit, twitter, …) before spending a network round-trip.
3. **Live URL check** — same `LinkValidatorService` everyone uses.
4. **Product-schema check** — the `ProductExtractorService` only returns when JSON-LD `Product`, `og:price:amount`, or microdata `itemprop="price"` is present. Editorial pages don't have these — only real listings do.
5. **Per-listing storeName** is derived from the URL host (`newegg.com` → "Newegg"), so the FE shows the actual retailer name rather than "Open Web".
6. **Lower trust** (baseline 0.45, hint 0.4) so open-web listings only outrank curated retailers when the price is genuinely lower.

### 1d. Intent validation (catches version drift)

The validator is the **primary backstop** for "user searched iPhone 17, got iPhone 15" bugs:

```mermaid
flowchart TD
    Q[Query] --> T[tokenize<br/>returns stems + critical]
    T --> S1["stems: alphabetic, len ≥ 3<br/>'iphone', 'samsung'"]
    T --> C1["critical: digits / 256gb / 1tb<br/>+ qualifiers: pro/max/plus/ultra/mini..."]

    C1 --> CT{every critical token<br/>in title?<br/>word-boundary regex}
    CT -->|❌| M[verdict: mismatch<br/>confidence: 1.0]
    CT -->|✅| ST{stem overlap ratio}

    ST -->|≥ 50%| MA[verdict: match]
    ST -->|25–50%| UN[verdict: uncertain]
    ST -->|< 25%| M2[verdict: mismatch]
```

Numeric tokens match with digit boundaries so `17` matches `iPhone 17 Pro` but **not** `iPhone 17X` or `2017`.

### 1e. Data model

```mermaid
erDiagram
    USER ||--o{ PRICING_SEARCH : "creates"
    PRICING_SEARCH ||--o{ PRICING_RESULT : "has"
    PRICING_RESULT ||--o{ PRICING_REVIEW : "has"

    USER {
        string id PK
        string email
    }
    PRICING_SEARCH {
        string id PK
        string userId FK
        string productName
        string intent
        string country
        string category
        string currency
        int maxPriceUsd
        enum status "PENDING|RUNNING|COMPLETED|ERROR"
        json alternatives "3 cheaper alts"
        json metadata "diagnostics + drop log"
    }
    PRICING_RESULT {
        string id PK
        string searchId FK
        string source "amazon, jumia, ..."
        string storeName
        string title
        float priceUsd
        float priceNative
        string currencyNative
        string url "validated, live"
        string imageUrl
        string youtubeUrl
        float rating
        int reviewCount
        float trustScore
        float rankScore
        float percentile "0=cheapest"
        string intentMatch "match|uncertain"
        string dealBadge
    }
    PRICING_REVIEW {
        string id PK
        string resultId FK
        string author
        float rating
        string body
    }
```

### 1f. HTTP endpoints

| Method | Path | What |
|---|---|---|
| `POST` | `/pricing-crawla/search` | Create + enqueue a search (gate + consume) |
| `GET` | `/pricing-crawla/searches` | Recent searches for current user |
| `GET` | `/pricing-crawla/:searchId/results` | Results for a search (polled while RUNNING) |
| `GET` | `/pricing-crawla/result/:id/details` | Product detail + reviews |
| `GET` | `/pricing-crawla/meta` | Trending products, countries, categories, stats |
| `GET` | `/pricing-crawla/rates` | Live FX table |
| `POST` | `/pricing-crawla/convert-currency` | USD → target conversion |
| `DELETE` | `/pricing-crawla/:id` | Hard-delete (cascade) |

---

## 2. Job Search 💼

> Skip job boards. Crawl tracked company career pages directly. AI-scored relevance, salary extraction.

### 2a. User journey

```mermaid
flowchart LR
    A[/jobs<br/>Search + recent list/]
    B[/jobs/:id<br/>Results page/]
    Admin[/admin/tracked-companies<br/>CRUD/]

    A -- submit role --> B
    A -- click recent card --> B
    A -- click trash, ConfirmDialog --> A
    B -- Apply → external --> X((🏢 company careers))
    B -- Delete button --> A
    Admin -.curates the list of<br/>companies the worker crawls.-> A
```

### 2b. Backend pipeline

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as JobSearchController
    participant SVC as JobSearchService
    participant FEAT as FeatureAccessService
    participant DB as Postgres
    participant Q as BullMQ<br/>(job-search queue)
    participant W as JobSearchProcessor

    FE->>API: POST /job-search
    API->>SVC: createSearch(userId, dto)
    SVC->>FEAT: consume('job_search')
    FEAT-->>SVC: ok / 403
    SVC->>DB: INSERT job_search<br/>(status=PENDING)
    SVC->>Q: runSearch(id)
    SVC-->>FE: { search }
    FE->>FE: router.push(/jobs/:id)

    Note over Q,W: async — FE polls every 2s
    Q->>W: process(job)
    W->>DB: SELECT tracked_company<br/>WHERE status=ACTIVE
    par per company (parallel)
        W->>W: adapter.fetch()
    end
    W->>W: AiRelevanceService.score<br/>(drop < 50)
    W->>DB: write job_result rows
    W->>DB: update jobCount + lastCrawled<br/>per company
    W->>DB: UPDATE status=COMPLETED
```

### 2c. Relevance scoring

```mermaid
flowchart TD
    J["Raw job listing<br/>{title, description, tags}"]
    R[Role query]
    R --> RT["roleTokens"]
    J --> H["haystack = title + description + tags"]
    RT --> CMP{token overlap ratio}
    H --> CMP

    CMP --> B[base = ratio × 80]
    B --> SB[+ seniority boost<br/>if both senior/staff/lead]
    SB --> TB[+ tag boost<br/>min 6]
    TB --> Score[clamp 0..100]

    Score --> Cut{score ≥ 50?}
    Cut -->|❌| Drop[(dropped)]
    Cut -->|✅ ≥ 85| Strong[strong match · green gauge]
    Cut -->|✅ 75–85| Good[good match · amber]
    Cut -->|✅ 50–75| Mid[mid match · gray]
```

### 2d. Tracked Companies admin

Admin-only CRUD page that drives **which** companies the worker crawls. A row at `status=PAUSED` is silently excluded from the next sweep without losing its history.

```mermaid
flowchart LR
    Admin[/admin/tracked-companies/]
    Admin -- POST + name + URL + interval --> Add[Create<br/>UPSERT by name]
    Admin -- PATCH --> Edit[Update<br/>name/URL/selector/interval/status]
    Admin -- DELETE --> Rm[Delete<br/>FK SET NULL on job_result]
    Admin -- toggle --> Pause[Flip status ACTIVE ↔ PAUSED]

    Add --> DB[(tracked_company)]
    Edit --> DB
    Rm --> DB
    Pause --> DB

    DB -.Job Search worker reads<br/>only status=ACTIVE rows.-> W[JobSearchProcessor]
```

### 2e. Data model

```mermaid
erDiagram
    USER ||--o{ JOB_SEARCH : "creates"
    JOB_SEARCH ||--o{ JOB_RESULT : "has"
    TRACKED_COMPANY ||--o{ JOB_RESULT : "produced"

    USER {
        string id PK
    }
    JOB_SEARCH {
        string id PK
        string userId FK
        string role
        string country
        bool remote
        enum status "PENDING|RUNNING|COMPLETED|ERROR"
        json metadata
    }
    JOB_RESULT {
        string id PK
        string searchId FK
        string companyId FK "nullable"
        string companyName
        string title
        string location
        bool remote
        int salaryMin
        int salaryMax
        string currency
        string salaryPeriod "year|month"
        string url
        string description
        int relevanceScore "0-100"
        string_array tags
        date postedAt
    }
    TRACKED_COMPANY {
        string id PK
        string name UK
        string careerUrl
        string selector "optional override"
        int crawlIntervalMin "default 15"
        enum status "ACTIVE|PAUSED|ERROR"
        date lastCrawled
        string lastError
        int jobCount "cached count"
    }
```

### 2f. HTTP endpoints

| Method | Path | What |
|---|---|---|
| `POST` | `/job-search` | Create + enqueue a search (gate + consume) |
| `GET` | `/job-search` | Recent searches for current user |
| `GET` | `/job-search/:id/results` | Results for a search |
| `GET` | `/job-search/meta` | Hot titles, countries, stats |
| `DELETE` | `/job-search/:id` | Hard-delete (cascade) |
| `GET` | `/admin/tracked-companies` | List (admin) |
| `POST` | `/admin/tracked-companies` | Create (admin) |
| `PATCH` | `/admin/tracked-companies/:id` | Update (admin) |
| `DELETE` | `/admin/tracked-companies/:id` | Delete (admin) |

---

## 3. Shared infrastructure 🔒

### 3a. FeatureAccessService — the single gate

Both features use the **same** gating service. Adding a new gated feature is one entry in the registry — no new `assertX` method, no new controller endpoint, no FE wiring change.

```mermaid
flowchart TD
    Caller["Caller<br/>(PricingCrawlaService, JobSearchService, ...)"]
    Caller -->|features.require<br/>userId, 'pricing_crawla'| FAS[FeatureAccessService]

    FAS --> ENT[EntitlementsService.ensureFor]
    ENT --> DB[(user → subscription → plan.limits<br/>JSON column<br/>+ usage_meter)]

    FAS --> REG[features.registry.ts]
    REG --> Def["FEATURES['pricing_crawla'] = {<br/>  flag: 'pricingCrawla',<br/>  monthlyCapField: 'pricingCrawlaSearchesPerMonth',<br/>  usageField: 'pricingCrawlaSearches',<br/>  label, requiresLabel<br/>}"]

    FAS --> EVAL[evaluate]
    EVAL --> Q1{limits.flag === true?}
    Q1 -->|❌| Block[allowed: false<br/>reason: 'X requires Starter or higher']
    Q1 -->|✅| Q2{usage < cap<br/>OR cap < 0?}
    Q2 -->|❌| Block2[allowed: false<br/>reason: 'quota reached']
    Q2 -->|✅| Allow[allowed: true]

    Block --> Throw[ForbiddenException<br/>PLAN_LIMIT_EXCEEDED]
    Block2 --> Throw
    Allow --> Bump[features.consume → bump UsageMeter]
```

The FE reads `GET /features/access` once at mount and uses the response to drive sidebar visibility, upgrade cards, and quota labels. **Whatever the admin sets in `/admin/billing → Edit plan` flows here automatically.**

### 3b. Plan gating UX

```mermaid
flowchart LR
    User[User opens /pricing-crawla]
    User --> FE[useFeature 'pricing_crawla']
    FE --> Q{allowed?}
    Q -->|✅| Page[Render Search + recent]
    Q -->|❌ FREE plan| Up[Upgrade card<br/>label from registry<br/>requiresLabel: 'Starter or higher']
    Up --> Bill[/billing]
```

### 3c. Recent searches + delete

Both pages render `<RecentSearches />` at the bottom. Each card:

```mermaid
flowchart LR
    Card[Recent search card<br/>Link to /:id]
    Card -- hover --> Trash[Trash button appears<br/>top-right corner]
    Trash -- click<br/>stopPropagation --> CD[ConfirmDialog<br/>shadcn AlertDialog]
    CD -- Cancel --> Card
    CD -- Delete --> M[useDelete*Search mutation]
    M --> DB[(DELETE search<br/>cascade clears results)]
    M -- onSuccess --> Inv[invalidate recent list query]
    Inv --> Card
```

Same pattern on the standalone results page header (`/pricing-crawla/:id`, `/jobs/:id`) — Delete button, ConfirmDialog, on success → `router.push` back to the index.

---

## 4. Frontend routes

```mermaid
graph TD
    Side[Sidebar]
    Side --> P1[/pricing-crawla<br/>Search + recent/]
    Side --> J1[/jobs<br/>Search + recent/]
    Side --> A1[/admin/tracked-companies<br/>admin only/]

    P1 --> P2[/pricing-crawla/:id<br/>Results/]
    P2 --> P3[/pricing-crawla/result/:id<br/>Detail/]

    J1 --> J2[/jobs/:id<br/>Results/]
```

Every route has a sibling `opengraph-image.tsx` (per the I-9 stop-hook policy).

---

## 5. Operations 🛠

### How to add a new gated feature

1. Add a flag (and optional cap) to `PlanLimits` in `apps/api/src/modules/billing/plans.catalog.ts`.
2. Add a registry entry to `FEATURES` in `apps/api/src/modules/billing/features.registry.ts`.
3. In the feature's service, call `features.require(userId, '<new_key>')` or `features.consume(...)`.
4. On the FE, gate the UI with `useFeature('<new_key>')`.

That's it. The admin pricing card and upgrade modal both pick up the new bullet from `deriveFeatures()` automatically.

### How to add a new pricing retailer

Add a single entry to `RETAILERS` in `apps/api/src/modules/pricing-crawla/adapters/adapter.registry.ts`:

```ts
{ id: 'newegg', storeName: 'Newegg', domain: 'newegg.com',
  baselineTrust: 0.85, category: 'marketplace' }
```

`WebSearchAdapter` handles the rest (search → validate → extract). The
domain auto-joins `KNOWN_RETAILER_DOMAINS`, so the open-web adapter stops
discovering URLs from this retailer to avoid duplicates.

**When to promote an open-web discovery to a site-specific adapter**:
when a retailer shows up repeatedly in `pricing_result.metadata.host`
and you want a higher baseline trust score, dedicated SERP slots, or a
guaranteed search-position even when the open-web hit rate is noisy.

### How to add a new tracked company

Admin opens `/admin/tracked-companies → Add company`. The next worker sweep (default every 15 min) picks it up.

### Where rejected listings get logged

`pricing_search.metadata` includes:
- `adapterCount` — how many adapters fanned out
- `totalCollected` — raw listings from all adapters (pre-filter)
- `uniqueAfterDedup` — after `source::title` collapse
- `cleanForRanking` — after the mismatch backfill filter
- `keptAfterRanking` — what made it to disk (top 10 by rankScore)
- `droppedForMismatch` — failed the intent backstop
- `sampleDropReasons` — first 5 mismatch reasons (store, title, why)
- `errors` — per-adapter failures
- `durationMs`

The funnel from `totalCollected → keptAfterRanking` is the most useful
debugging signal: a large gap means the search is finding plenty of
candidates but ranking/filtering is rejecting most of them — usually
because intent validation is catching version drift.

Useful for figuring out why a search returned fewer results than expected.

### Source of truth quick reference

| Question | Where to look |
|---|---|
| What features exist? | `apps/api/src/modules/billing/features.registry.ts` |
| What's a user's plan allow? | `plan.limits` JSON in DB (admin-editable via `/admin/billing`) |
| Which retailers do we crawl? | `RETAILERS` in `adapter.registry.ts` |
| Which companies do we crawl? | `tracked_company` table (admin UI) |
| Why was a listing dropped? | `pricing_search.metadata.sampleDropReasons` |
| Why was a job dropped? | Relevance below 50 (configured in `AiRelevanceService.DROP_BELOW`) |
