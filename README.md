# CRWLA

Keyword-driven web research aggregator. Run scheduled crawls, filter results
with a natural-language prompt (Claude or heuristic), and search across
everything via Postgres FTS or Elasticsearch.

> **Operators / future Claude sessions**: read **[HARNESS.md](./HARNESS.md)** first.
> It is the operating manual — invariants, self-checks, repair recipes, and
> evolution rules for this repo. The boot-time self-check in `apps/api`
> verifies each invariant and prints repair commands on failure.

## Repo layout

```
.
├── apps/
│   ├── api/        # NestJS 10 + Prisma 6 + BullMQ + Elasticsearch
│   ├── web/        # Next.js 15 (App Router) + Tailwind + shadcn/ui
│   └── mobile/     # Expo SDK 51+ (expo-router)
├── infra/
│   └── docker-compose.yml   # postgres + redis + elasticsearch + kibana
├── HARNESS.md      # ← operating manual
├── README.md
└── package.json    # thin convenience scripts (infra:up, api:dev, …)
```

Each `apps/*` is a fully independent project — its own `package.json` and
lockfile. There is **no** monorepo tooling: shared types are duplicated
deliberately until the duplication actually hurts (see HARNESS.md §5).

## Quick start

```sh
# from the repo root — convenience scripts in the root package.json
npm run infra:up         # docker compose: postgres + redis + elasticsearch + kibana
# (one-time) initialize the API
cd apps/api && cp .env.example .env && npm install && npx prisma migrate deploy
# run everything (in three terminals)
npm run api:dev          # → http://localhost:3001/api/health
npm run web:dev          # → http://localhost:3000
npm run mobile:dev       # → press i / a, or scan QR in Expo Go
```

First-boot logs print the seeded admin credentials (defaults: `admin@crwla.io` / `admin`).

## Stack

| App | Stack |
|---|---|
| `apps/api` | NestJS 10, Prisma 6, Postgres 16, BullMQ 5 + Redis 7, Elasticsearch 8 (optional), Cheerio + Playwright (optional), Anthropic API (optional) |
| `apps/web` | Next.js 15 App Router, React 19, Tailwind CSS 3, shadcn/ui (new-york), TanStack Query, React Hook Form, Zod |
| `apps/mobile` | Expo SDK 51, expo-router, expo-secure-store, React Native 0.74 |

## Auth

JWT in an httpOnly cookie (`crwla_token`) issued by `apps/api`. The web app
forwards the cookie via Next.js rewrites; the mobile app stores the token
in `expo-secure-store` and sends it as `Authorization: Bearer`.

## Search architecture

- **Postgres** is the source of truth. Every `Result` has a generated
  `tsvector` column (`searchVector`) backed by a GIN index — see
  `apps/api/prisma/migrations/20260503_init_fts/migration.sql`.
- **Elasticsearch** is the optional advanced-search layer. After every
  successful crawl, BullMQ's `search-index` queue bulk-indexes the new
  rows. If `ELASTICSEARCH_URL` is unset the queue no-ops and `/api/search`
  falls back to PG FTS via `websearch_to_tsquery`.

## Configuration

See HARNESS.md §6 for the full env-var matrix across `apps/{api,web,mobile}`.
