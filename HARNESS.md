# CRWLA Harness

This file is the operating manual for the CRWLA project. It is **load-bearing**: every Claude session, agent, or human contributor reads it first to (a) verify the system is intact, (b) repair drift when it isn't, and (c) extend the harness without breaking invariants.

If you change the architecture, you change this file in the **same commit**. Stale playbooks lie.

---

## 1. Purpose

CRWLA = a keyword-driven, prompt-filtered web research aggregator. The harness is the scaffolding that lets us grow the product without re-doing the boring parts. It is "self-healing" in a specific, narrow sense:

- **Boot-time self-check** runs every time the API starts. It verifies each invariant below and prints the exact repair command if one fails.
- **Repair recipes** in §4 are short, copy-pasteable, and idempotent.
- **Evolution rules** in §5 keep the playbook honest as the project grows — every new module/queue/env-var adds a checklist item.

A future Claude session that walks into this repo cold should be able to: read this file → run `npm run self-check` → follow any printed repair commands → reach a green tree.

---

## 2. Repository layout

```
.
├── apps/
│   ├── api/        # NestJS 10 API. The ONLY writer to Postgres.
│   ├── web/        # Next.js 15 App Router. Talks to apps/api over HTTP.
│   └── mobile/     # Expo SDK 51+. Talks to apps/api over HTTP.
├── infra/
│   └── docker-compose.yml   # postgres + redis + elasticsearch + kibana
├── HARNESS.md      # ← this file
├── README.md
└── package.json    # thin convenience scripts (infra:up, api:dev, …)
```

Each `apps/*` is a fully independent project with its own `package.json` and lockfile. There is **no** monorepo tooling (Turborepo / pnpm workspaces). Shared types are duplicated, by design, until the duplication actually hurts.

---

## 3. Architecture invariants

Each invariant has: **rule**, **why**, **verify**, **repair**.

### I-1. apps/api is the only writer to Postgres
- **Rule**: Only `apps/api` imports `@prisma/client`. The web/mobile apps never bypass the API.
- **Why**: Centralizes auth, validation, and audit logging. Two writers = race conditions and divergent invariants.
- **Verify**: `grep -RE "from '@prisma/client'" apps/web apps/mobile` returns nothing.
- **Repair**: Move the Prisma call into a NestJS controller and have the front-end call `/api/...`.

### I-2. apps/web and apps/mobile never share a process or filesystem with the API
- **Rule**: `apps/web` reaches the API via HTTP only (Next rewrites in dev, env-configured base URL in prod). No `import` paths cross app boundaries.
- **Why**: Lets us deploy each app independently and replace any one without touching the others.
- **Verify**: `grep -RE "from ['\"]\\.\\./\\.\\./api" apps/web apps/mobile` returns nothing.
- **Repair**: Move shared logic behind an HTTP endpoint in `apps/api`. If types are duplicated and drifting, accept the duplication for now — see §5 for when to extract a package.

### I-3. All cron schedules live in BullMQ repeatable jobs, not in-process timers
- **Rule**: The `apps/api/src/queues/scrape/scrape.queue.ts` `scheduleRepeatable()` is the only place that arms recurring crawls.
- **Why**: In-memory timers vanish on restart, fire twice when scaled horizontally, and can't be observed via Bull Board.
- **Verify**: `grep -RE "setInterval|setTimeout.*runJob" apps/api/src` returns nothing meaningful (UI countdowns are fine).
- **Repair**: Replace any timer with `ScrapeQueue.scheduleRepeatable(searchId, cron)`.

### I-4. Every protected route is behind `JwtAuthGuard`
- **Rule**: Every `apps/api/src/modules/<m>/*.controller.ts` that handles user data declares `@UseGuards(JwtAuthGuard)`. Admin-only routes additionally use `AdminGuard`.
- **Why**: Defense-in-depth — guards live next to routes so adding a new endpoint can't silently leak.
- **Verify**: `grep -L "JwtAuthGuard" apps/api/src/modules/**/*.controller.ts` should only print the AuthController itself.
- **Repair**: Add `@UseGuards(JwtAuthGuard)` (and `AdminGuard` where appropriate) to the offending controller.

### I-5. Every `Result` row is eventually indexed in Elasticsearch (when ES is enabled)
- **Rule**: After `Result.createMany`, `SearchIndexQueue.bulkIndex()` is invoked. With ES enabled, `count(prisma.result) ≈ count(crwla_results)` ± in-flight queue depth.
- **Why**: ES is the search experience; PG FTS is the durable backstop. Drift between them silently degrades the product.
- **Verify**:
  ```sh
  cd apps/api && npx prisma db execute --stdin <<<'SELECT count(*) FROM "Result";'
  curl -s localhost:9200/crwla_results/_count
  ```
  Compare counts modulo BullMQ queue depth (`/admin/queues`).
- **Repair**: If ES is far behind, run `npm run es:reindex` (TODO — implement in Phase 7+; manual `bullQueue.add('bulk-index-results', { ids: [...] })` works today).

### I-6. The `Result.searchVector` column + GIN index always exist
- **Rule**: The migration `20260503_init_fts/migration.sql` adds them. Self-check verifies presence on boot.
- **Why**: PG FTS is the search fallback when ES is disabled. Without the index, queries fall back to seq-scan and the API gets slow at ~10k rows.
- **Verify**: Run `npm run self-check`. Look for `[OK] fts column` and `[OK] fts index` lines.
- **Repair**: Re-apply the migration: `cd apps/api && npx prisma migrate deploy`. If the index was dropped manually:
  ```sql
  CREATE INDEX CONCURRENTLY idx_result_search_vector
    ON "Result" USING GIN ("searchVector");
  ```

### I-7. Admin user is always seeded on first boot
- **Rule**: `AuthService.ensureAdmin()` runs in `main.ts` before `listen()`. If `User.count() == 0`, an admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` is created.
- **Why**: A fresh DB without any login is a debugging dead-end.
- **Verify**: After first boot, exactly one `User` with `role=ADMIN, active=true` exists.
- **Repair**: Set `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `apps/api/.env` and restart. The seed only fires when the user table is empty — to re-seed, truncate first (destructive — confirm before running).

### I-8. `npm run worker` is a real, runnable script
- **Rule**: `apps/api/src/queue-worker.ts` boots the same NestJS app context without HTTP. Exists, compiles, and runs on its own.
- **Why**: We want to be able to scale workers independently. The legacy app had a broken `npm run worker` reference — that mistake stays repaired.
- **Verify**: `cd apps/api && npm run worker:dev` starts and logs "CRWLA worker online".
- **Repair**: If the file is missing, recreate it from §"queue-worker.ts" in this file. If it crashes on missing modules, ensure all queue modules are listed in `AppModule.imports`.

### I-9. Every web page has an OG image component
- **Rule**: For every `apps/web/app/.../page.tsx` (any route group, including dynamic `[param]` routes), a sibling `opengraph-image.tsx` (or `.ts`/`.jsx`/`.png`/`.jpg`/`.jpeg`) exists. The `.tsx` variant imports a component from `apps/web/components/metadata/<Name>Og.tsx` and renders it via `renderOg()` from `apps/web/lib/og/render.tsx`.
- **Why**: Link-previews on Slack, X, iMessage, Linear, and GitHub fall back to a generic / broken image when the OG meta is missing. The metadata folder + Satori render path keeps the cost cheap: dynamic OGs fetch only the small slot payload they need; static OGs are cached by Next at build time.
- **Verify**: `./.claude/hooks/check-og-images.sh` exits 0. The hook also runs as a `Stop` hook (`.claude/settings.local.json`) so a Claude session that adds a `page.tsx` cannot end without its OG component.
- **Repair**: Add a `<RouteName>Og.tsx` to `apps/web/components/metadata/` (see that folder's `README.md` for the convention and `DESIGN_PROMPT.md` for the visual brief), then add an `opengraph-image.tsx` next to the offending `page.tsx`. Dynamic routes should fetch only the slot fields they need server-side and pass them as props.

### I-10. Every public marketing page carries canonical + unique SEO metadata
- **Rule**: Each `apps/web/app/(marketing)/**/page.tsx` exports a `metadata` with a unique `description`, `alternates.canonical`, and per-page `openGraph`/`twitter`. The canonical origin comes from `apps/web/lib/seo.ts` (`SITE_URL`, default `https://crwla.com`, override via `NEXT_PUBLIC_SITE_URL`) — **never hardcode the domain**; build absolute URLs with `absoluteUrl()`. The root `apps/web/app/layout.tsx` sets `metadataBase`, the `%s · CRWLA` title template, default robots (`index/follow`), and default OG/Twitter cards. `app/sitemap.ts` lists every public marketing URL and `app/robots.ts` disallows the authenticated app + auth/transactional routes. Structured data (JSON-LD) lives in `components/metadata/JsonLd.tsx` and renders on the landing page. Conventions follow Google's SEO Starter Guide (https://developers.google.com/search/docs/fundamentals/seo-starter-guide).
- **Why**: The marketing pages are the only indexable surface; the authenticated app must stay out of search. Missing canonicals invite duplicate-content splits across `dev.crwla.com`/`crwla.com`, and a relative `metadataBase` breaks OG/canonical absolute URLs in link previews and search results.
- **Verify**: `grep -L "alternates" apps/web/app/\(marketing\)/**/page.tsx` prints nothing; `apps/web/app/sitemap.ts` and `apps/web/app/robots.ts` exist; `grep -RE "https?://(www\.)?crwla\.com" apps/web/app apps/web/components` finds no hardcoded origin outside `lib/seo.ts`.
- **Repair**: Add the missing `alternates.canonical` + `openGraph`/`twitter` to the page's `metadata` (copy the shape from `app/(marketing)/about/page.tsx`); add the route to `app/sitemap.ts`; if it's a private route that leaked, add it to the `disallow` list in `app/robots.ts`.

---

## 4. Boot-time self-check

`apps/api/src/health/self-check.service.ts` runs at startup. The same checks back the `GET /api/health` endpoint and the `npm run self-check` CLI.

What it checks (each maps to an invariant above):

| # | Check | If FAIL | Halts boot? |
|---|---|---|---|
| 1 | Postgres reachable | Repair: `docker compose -f infra/docker-compose.yml up -d postgres` | YES |
| 2 | Redis reachable | Repair: `docker compose up -d redis`. Queues degrade if absent. | NO (warn) |
| 3 | Elasticsearch reachable | Repair: `docker compose up -d elasticsearch`. Falls back to PG FTS. | NO (warn) |
| 4 | `Result.searchVector` column present | Repair: `npx prisma migrate deploy` | NO (warn) |
| 5 | `idx_result_search_vector` index present | Repair: see I-6 | NO (warn) |
| 6 | At least one active admin exists | Repair: see I-7 | NO (warn) |

The HTTP body of `GET /api/health` is the same `SelfCheckReport` JSON the boot logger prints, so you can curl it from CI.

---

## 5. Evolution rules

When you add new functionality, these checklists keep the harness self-consistent.

### 5a. New API module
1. Create `apps/api/src/modules/<name>/{<name>.module.ts,<name>.service.ts,<name>.controller.ts}` plus `dto/`.
2. Register the module in `apps/api/src/app.module.ts`.
3. Default to `@UseGuards(JwtAuthGuard)` on the controller. Add `AdminGuard` for admin endpoints.
4. Add a `*.spec.ts` for the service and an e2e test for the controller in `apps/api/test/`.
5. If the module touches new tables → see 5c.

### 5b. New queue
1. Create `apps/api/src/queues/<name>/{<name>.queue.ts,<name>.processor.ts}`.
2. Register the queue name (`SCRAPE_QUEUE`-style export) in `queues.module.ts` and add it to `BullModule.registerQueue`.
3. Document the concurrency choice in the processor's `@Processor` decorator.
4. Add the worker to `queue-worker.ts` if it should run on a dedicated worker process.
5. Add a self-check assertion if the queue's absence would silently break a feature.

### 5c. New table or schema change
1. Edit `apps/api/prisma/schema.prisma`.
2. `cd apps/api && npx prisma migrate dev --name <change>`.
3. If the column needs a generated value (tsvector, computed) or a special index (GIN, partial), add a **second** raw-SQL migration in the same migrations dir — Prisma can't express those.
4. If the table is search-relevant, update `apps/api/src/integrations/elasticsearch/es.service.ts#ensureIndex` mapping and bump the index name (e.g. `crwla_results_v2`) to force a rebuild.
5. If the column is invariant-load-bearing (like `searchVector`), add it to `SelfCheckService` so future boots verify presence.

### 5d. New env var
1. Add to `apps/api/.env.example` (or `apps/web/.env.local.example`, `apps/mobile/app.json` extra).
2. Add a Joi rule in `apps/api/src/config/env.validation.ts`. Choose `optional()` vs `required()` deliberately.
3. Document in this file under §6 (Configuration matrix).
4. If the var changes externally-observable behavior, mention it in the relevant invariant.

### 5e. New web route or screen
1. Add the page under `apps/web/app/(auth)` or `apps/web/app/(app)` depending on auth requirement.
2. The `(app)/layout.tsx` server component reads the `crwla_token` cookie and 302s to `/signin` if absent — never re-implement the auth check inline.
3. Use shadcn primitives in `apps/web/components/ui/`. Do not reach into Tailwind utility classes for layout that has a primitive.
4. Add the route to `apps/web/middleware.ts` matcher if the auth gate is the only thing standing in front of it.
5. **OG image (I-9):** add `apps/web/components/metadata/<RouteName>Og.tsx` and a sibling `opengraph-image.tsx` that calls `renderOg(<RouteNameOg {...slots} />)`. For dynamic routes, fetch only the small slot payload (≤90 chars per text field) inside `opengraph-image.tsx` — don't reuse the full page loader. The Stop hook at `.claude/hooks/check-og-images.sh` enforces this; see `apps/web/components/metadata/README.md` for the convention and `DESIGN_PROMPT.md` for the visual brief.
6. **SEO metadata (I-10), public/marketing routes only:** export `metadata` with a unique `description`, `alternates.canonical`, and per-page `openGraph`/`twitter` (use `SITE_URL`/`absoluteUrl()` from `apps/web/lib/seo.ts` — never hardcode the domain), and add the route to `app/sitemap.ts`. If the route is private/authenticated, instead add it to the `disallow` list in `app/robots.ts`.

### 5f. New mobile screen
1. Add under `apps/mobile/app/(auth)` or `apps/mobile/app/(tabs)`.
2. Use the `useAuth()` context in `apps/mobile/lib/auth.tsx` for session state — don't read `expo-secure-store` directly from screens.

### 5g. New content / blog / editorial page (people-first content)
This is a **judgment checklist, not a grep-able invariant** — there's no mechanical verify. It applies to article-style content (blog, changelog, guides, comparisons), **not** product marketing pages. Follows Google's "Creating helpful, reliable, people-first content" guide (https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Also satisfy I-10 (canonical/OG/sitemap) for any such page.
1. **Who** — attribute it. Real byline + author/credibility info; reflect any new public person in the `Organization`/author JSON-LD (keep `components/metadata/JsonLd.tsx` `founder[]` in sync with `about-client.tsx`).
2. **How** — if a claim rests on testing/research, state the method and evidence. If AI/automation drafted it, disclose that and why it served the reader — never mass-produce multi-topic pages for ranking.
3. **Why** — write for the reader, not the ranking. Add original insight/value beyond restating obvious info; no arbitrary word counts; don't fake freshness (only change dates on real updates) or make unconfirmed claims.
4. E-E-A-T bar: Experience, Expertise, Authoritativeness, Trust (trust is foundational; weigh hardest on any YMYL topic). Ask "would a reader bookmark/share this?" before shipping.

---

## 6. Configuration matrix

### apps/api `.env`
| Var | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | one of development/production/test |
| `PORT` | `3001` | HTTP port |
| `API_BASE_PATH` | `/api` | global Nest prefix |
| `CORS_ORIGIN` | `http://localhost:3000` | apps/web origin |
| `COOKIE_NAME` | `crwla_token` | session cookie name |
| `DATABASE_URL` | — | **required**, Postgres |
| `JWT_SECRET` | — | **required**, ≥ 8 chars |
| `SESSION_DAYS` | `14` | cookie + jwt lifetime |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `admin@crwla.io` / `admin` / `Admin` | seeded only when User table is empty |
| `REDIS_URL` | — | optional; queues degrade without it |
| `ELASTICSEARCH_URL` | — | optional; PG FTS used when unset |
| `ELASTICSEARCH_INDEX` | `crwla_results` | bump to force re-index |
| `USER_AGENT` | `CRWLA/1.0` | scraper UA |
| `DEFAULT_LOCALE` / `DEFAULT_REGION` | `en-US` / `US` | Google News |
| `ANTHROPIC_API_KEY` | — | optional; LLM filter on/off |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` | model for filter prompts |

### apps/web `.env.local`
| Var | Default | Notes |
|---|---|---|
| `API_URL` | `http://localhost:3001` | server-side; cookies forwarded |
| `NEXT_PUBLIC_API_URL` | `/api` | client-side; defaults to relative path via Next rewrite |

### apps/mobile (`app.json` `expo.extra` or env)
| Var | Default | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001/api` | base URL for the API |

---

## 7. Repair recipes

### `npm run worker` is broken
- Symptom: `Cannot find module 'dist/queue-worker.js'`.
- Repair: `npm run build` first, then `npm run worker`. For dev: `npm run worker:dev` uses ts-node directly.
- Root cause to check: did someone remove `apps/api/src/queue-worker.ts`? Recreate per §3 / I-8.

### Migrations drifted
- Symptom: `npx prisma migrate status` shows pending or out-of-sync.
- Repair (dev): `npx prisma migrate dev`.
- Repair (prod): `npx prisma migrate deploy`.
- If you also need to re-apply the FTS migration (e.g. someone reset the schema): `psql $DATABASE_URL -f apps/api/prisma/migrations/20260503_init_fts/migration.sql`.

### BullMQ repeatables duplicated
- Symptom: a single search fires more than once per cron tick.
- Repair: from a Node REPL connected to the API context (`npm run start:prod` then attach), run:
  ```js
  await bullQueue.obliterate({ force: true });   // wipes only this queue
  await schedulerService.reschedule();           // re-arms from DB
  ```
- Or simpler: drop all repeatables in Bull Board, then `kill -USR2` the API to trigger `SchedulerService.onModuleInit` again (or just restart).

### ES mapping is out of date
- Symptom: queries return zero hits even though docs are indexed; mapping field types don't match `es.service.ts`.
- Repair:
  ```sh
  curl -X DELETE localhost:9200/crwla_results
  cd apps/api && npm run es:bootstrap
  # re-index existing rows: TODO npm run es:reindex
  ```

### Frontend can't reach API
- Symptom: dev console shows CORS errors or `ECONNREFUSED`.
- Repair: in `apps/web/next.config.mjs`, ensure the rewrite to `${API_URL}/api/:path*` matches your API port. Confirm `apps/api/.env` `CORS_ORIGIN` includes `http://localhost:3000`.

### Lost admin password
- Repair (last resort, destructive — confirm before running):
  ```sql
  DELETE FROM "User";  -- then restart api → ensureAdmin re-seeds
  ```
- Better: `UPDATE "User" SET "passwordHash" = '<bcrypt of new password>' WHERE email='admin@crwla.io';`

---

## 8. Verification matrix (full e2e)

Run on a clean machine to prove the system works end-to-end.

```sh
# 1. infra
docker compose -f infra/docker-compose.yml up -d
# wait for healthchecks
docker compose -f infra/docker-compose.yml ps

# 2. api
cd apps/api
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
#   → expect "[OK] postgres", "[OK] redis", "[OK] elasticsearch",
#     "[OK] fts column", "[OK] fts index", "[OK] admin seeded"

# 3. web (separate terminal)
cd apps/web
cp .env.local.example .env.local 
npm install
npm run dev
#   → http://localhost:3000

# 4. mobile (separate terminal)
cd apps/mobile
npm install
npx expo start
#   → press i / a for sim, or scan QR

# 5. e2e happy path (browser)
# - sign in: admin@crwla.io / admin
# - create search "AI Funding" with keywords [openai, anthropic]
# - press Run now → wait → results appear
# - curl 'http://localhost:3001/api/search?q=funding' → returns hits
# - if ES enabled, kibana: http://localhost:5601 → see crwla_results docs
```

If any step fails, the failing line of `runSelfChecks()` plus §7 above gets you back to green.

---

## 9. Open questions / TODOs

These are kept here, not in memory — they evolve with the project.

- [ ] `npm run es:reindex` — script that walks `Result` and re-enqueues `bulk-index-results` for everything (used after a mapping bump).
- [ ] Bull Board mount at `/admin/queues` (gated by `AdminGuard`).
- [ ] Swagger/OpenAPI generation for `apps/api` (`@nestjs/swagger` already in deps).
- [ ] Decide when type duplication between `apps/api/src/dto/*` and `apps/web/lib/types.ts` becomes painful enough to extract a shared package (rough threshold: when 3+ DTOs drift in the same week).
- [ ] Mobile alerts UI — backend exists (`/api/alerts`), screens not wired.

---

## 10. Update protocol

If a Claude session changes the architecture, it MUST in the same change:

1. Update the affected invariant(s) in §3.
2. Update the self-check in `apps/api/src/health/self-check.service.ts` if the change adds/removes a load-bearing component.
3. Update §6 (config matrix) if env vars changed.
4. Add a TODO in §9 for any deferred follow-up.
5. If a new repair recipe applies, add it to §7.

A change that touches `apps/api/src/app.module.ts`, `apps/api/prisma/schema.prisma`, `apps/api/src/queues/`, or `infra/docker-compose.yml` is almost certainly architectural — assume yes, and only skip the HARNESS update if you can argue why the change is purely internal to a single module.
