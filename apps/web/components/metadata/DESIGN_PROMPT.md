# OG cover designs — prompt for Claude Design

Use this as the brief you paste into Claude Design. It enumerates every page in CRWLA (static and dynamic), the brand language, and the rendering constraints, so the resulting designs drop straight into `apps/web/components/metadata/` and render via Next.js `ImageResponse` (Satori).

---

## 1. Product context

- **Name**: CRWLA
- **One-liner**: Keyword-driven web research aggregator. Paste keywords → results from news, social, forums, and blogs land in one live dashboard.
- **Audience**: Researchers, analysts, journalists, procurement, ops teams. People who would otherwise have 80 tabs open.
- **Voice**: Calm, declarative, slightly dry. Editorial more than corporate. No exclamation marks.

## 2. Brand tokens (use these, don't invent)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `hsl(0 0% 98%)` `#FAFAFA` | `hsl(0 0% 7%)` `#121212` |
| `--bg-elev` | `hsl(0 0% 100%)` `#FFFFFF` | `hsl(0 0% 9%)` `#171717` |
| `--bg-sunk` | `hsl(240 5% 96%)` `#F4F4F5` | `hsl(0 0% 14%)` `#242424` |
| `--fg` (ink) | near-black `#0A0A0A` | near-white `#FAFAFA` |
| `--fg-muted` | `#737373` | `#A1A1A1` |
| `--fg-subtle` | `#A3A3A3` | `#737373` |
| `--mk-accent` (marketing) | warm leaf-green / amber accent — keep brand spot color, use sparingly | same |

Typography in product UI is system-sans + JetBrains Mono for metadata captions. Marketing pages use **Fraunces** (display) and **Instrument Serif** (italic editorial). Keep that hierarchy on OG cards: serif for hero phrase on marketing OGs, sans for product OGs.

## 3. Output spec — every design must hit these constraints

- **Canvas**: 1200×630, landscape, exported as a vector composition (figma frame or SVG-equivalent layout description). Don't anti-alias text into the image — final rendering is Satori, which re-rasterizes vector + text.
- **Safe area**: keep all type and logos inside a 1100×540 inner box (50px gutter); platforms crop edges differently.
- **Light variant only for now**. Each card will be re-styled in code for dark mode, but design in light first.
- **Logo placement**: top-left, "CRWLA" wordmark (uppercase sans, tracked +0.06em), 22px equivalent.
- **Page identifier**: top-right, mono caption like `CRWLA / DASHBOARD` or `CRWLA / P / <slug>` — uppercase, `--fg-subtle`, JetBrains Mono.
- **Hero phrase**: dominant center-left or center, max 6 words, max 2 lines. Hierarchy: serif for marketing, sans for product.
- **Sub-line**: one short factual line, `--fg-muted`, max 90 chars.
- **Composition motif**: every card carries one repeated visual motif so the suite reads as a set. **Suggested**: a faint dotted grid background + one foreground "data" element (a chip stack, a bar chart, a result card, etc.) that's *specific to the page*. Keep the motif vector-only.
- **No drop shadows on text. No photographic textures.** Satori won't render them. Solid fills, linear gradients, strokes, and basic radii only.
- **Borders**: 1px `--fg` at 8% opacity for any card or chip frame.
- **Corner radius**: 12 for primary cards, 6 for chips.

## 4. What to return per page

For each page below, return:

1. **Frame** (1200×630) — the full layout.
2. **Slot map** — name and pixel coordinates of every dynamic slot (title, subtitle, badge, chart bars, avatar circle, etc.) so I can wire props.
3. **Static-vs-dynamic** note — which slots accept runtime data, which are baked.
4. **Copy** — the static copy used on the design (I'll keep it in the OG component as a default).

Name each frame `og-<route-slug>` so files match the components folder (`<RouteName>Og.tsx`).

## 5. Pages to design

> Routes are grouped by Next.js route group. Dynamic routes are marked **DYNAMIC** — their slot map must list which fields come from the route params or fetched data.

### Marketing (route group `(marketing)`)

| File | Route | Static copy on the page | Hero phrase suggestion | Notes |
|---|---|---|---|---|
| `og-home` | `/` | "Search everything, all at once" | _Search everything,_ **all at once.** | Motif: stacked source lanes (news / social / forums / blogs) sliding into one column. |
| `og-pricing` | `/pricing` | "Pay for the search. Not the ads." | _Pay for the search._ **Not the ads.** | Motif: 5 price chips (Free, Starter, Basic, Pro, Business) in a row with one highlighted. |
| `og-about` | `/about` | "We were tired of opening tabs." | _We were tired of_ **opening tabs.** | Motif: a fan of browser-tab silhouettes collapsing into one. |
| `og-contact` | `/contact` | "Say hello." | **Say hello.** | Motif: a single envelope outline + a faint cursor. |

### Auth (route group `(auth)`)

| File | Route | Hero phrase | Notes |
|---|---|---|---|
| `og-signin` | `/signin` | **Sign in to CRWLA** | Sparse. Single input mock + caret. |
| `og-request-access` | `/request-access` | **Request access** | Same as signin variant, slightly different mock. |

### Product (route group `(app)`, auth-gated)

OG cards are rendered for completeness — most are behind login, but link-previews still need them. Keep them functional, not marketing.

| File | Route | Hero phrase | DYNAMIC? | Slot map |
|---|---|---|---|---|
| `og-dashboard` | `/dashboard` | **Your research, in one column.** | no | Motif: 4 result cards stacked, one highlighted as "new". |
| `og-crawls-new` | `/crawls/new` | **Start a new crawl** | no | Motif: keyword-input chips with a `+` chip on the end. |
| `og-crawl-detail` | `/crawls/[id]` | `{search.name}` (default "Crawl") | **yes** | Slots: `name`, `keywordCount`, `cron` (e.g. "DAILY"), `resultCount`, `lastRun`. Layout: title large; row of keyword chips below; right side: a tiny bar-chart of runs. |
| `og-crawl-edit` | `/crawls/[id]/edit` | **Editing {name}** | **yes** | Slot: `name`. Motif: form-row outlines. |
| `og-search` | `/search` | **Full-text across everything** | no | Motif: search bar + cascading result rows. |
| `og-alerts` | `/alerts` | **Alerts when it matters** | no | Motif: bell icon + 3 alert rows with timestamps. |
| `og-billing` | `/billing` | **{planName} plan** (default "Your plan") | **yes** | Slots: `planName`, `interval`, `renews` (date). Motif: ribbon + period chip. |
| `og-profile` | `/profile` | **Your account** | no | Motif: avatar circle + 3 setting rows. |
| `og-admin` | `/admin` | **Admin** | no | Motif: a stack of member rows. |
| `og-admin-users` | `/admin/users` | **Members** | no | Motif: 4 member chips in a 2×2. |
| `og-admin-billing` | `/admin/billing` | **Plans & pricing** | no | Motif: 5 plan cards. |

### Public share (route group root)

| File | Route | Hero phrase | DYNAMIC? | Slot map |
|---|---|---|---|---|
| `og-share` | `/p/[slug]` | `{search.name}` (default "Shared crawl") | **yes** | Slots: `name`, `ownerName` (caption: "Shared by {owner}"), `keywordCount`, `resultCount`, `lastRun`. Watermark: "Shared via CRWLA" bottom-right. This is the highest-impact card — it's the one strangers see. Spend extra time here. |

### Limited access (sibling of /p)

| File | Route | Hero phrase | Notes |
|---|---|---|---|
| `og-limited-access` | `/p/<unknown>` (fallback) | **Limited access** | Motif: closed lock + faint dotted card outline. Returned when slug is unknown OR owner revoked. |

## 6. Implementation constraints (so we can render cheaply)

Designs will be re-built as React components and rendered through Next.js `ImageResponse` (Satori under the hood). To keep render time under 200ms per card, please respect:

- **No web fonts beyond Fraunces, Instrument Serif, Inter, and JetBrains Mono.** I will preload only those.
- **No CSS filters, backdrop-filter, mask, mix-blend-mode.** Satori ignores them.
- **Strokes**: use SVG paths or rect strokes, not box-shadow.
- **Gradients**: linear only, max 2 stops.
- **Images**: avatars / logos can be passed as base64 data URLs; design with the assumption that *any* runtime image may fail to load — design must still parse when image slots are empty.
- **Numbers and short strings** can be dynamic. Long-form text (paragraphs) cannot — Satori line-wraps awkwardly. Keep dynamic copy to ≤90 chars.

## 7. Deliverables (what I want back from Claude Design)

1. One Figma file (or equivalent vector export) with **one frame per row in the tables above** (≈19 frames).
2. A `palette.json` confirming the exact hex values you used (in case you nudged any).
3. A `slot-map.json` keyed by frame name, listing every dynamic slot with its (x, y, width, height) and default value.
4. (Optional but appreciated) A short "system" frame showing the shared chrome — logo, mono caption, dotted grid, border treatment — so the suite reads as one family.

When you return these I'll wire each frame into `apps/web/components/metadata/<Name>Og.tsx` and a sibling `opengraph-image.tsx` in each route folder.
