# Email templates

Mailtrap-ready transactional email templates for CRWLA, built from the Claude
Design handoff (`Email Templates.html`). Each file is a standalone,
email-client-safe HTML document (table layout, inline CSS, MSO conditionals)
and uses Handlebars `{{variable}}` / `{{#each}}` syntax — the same syntax
Mailtrap's template engine fills from the `template_variables` payload.

The set intentionally uses **four distinct visual treatments** (per the design),
all sharing one brand system:

| Token             | Value                                                       |
| ----------------- | ----------------------------------------------------------- |
| Page background   | `#f4f2ed`                                                   |
| Card              | `#ffffff` · border `#e6e2d4` · radius 16px                  |
| Ink / heading     | `#0e0e0e` · body `#6e6b63` · muted `#a3a094`                |
| Accent (orange)   | `#ff5e3a` · hover/link `#e54a26` · light `#ff8a3a`          |
| Deep green        | `#2f4a3a` · accent `#8fc28a`                                |
| Mono / labels     | `'Courier New', monospace`                                  |
| Body font         | `'Segoe UI', Helvetica, Arial, sans-serif`                  |
| Container         | 600px, responsive down to 100% under 620px                 |

CTA buttons are black (`#0e0e0e`) with an orange hover. The brand mark is the
black circle + orange dot lockup used across the marketing site.

## Templates

### `verify-email.html` — email verification (user-facing)

Light card, orange→green gradient top band, envelope hero. Sent from
`AuthService.sendVerificationEmail`.

| Variable             | Source                                              |
| -------------------- | --------------------------------------------------- |
| `{{first_name}}`     | first token of `user.name`                          |
| `{{email}}`          | `user.email`                                        |
| `{{verification_url}}` | `${WEB_BASE_URL}/verify-email?token=<raw>`        |
| `{{ttl_hours}}`      | `EMAIL_VERIFICATION_TTL_HOURS` (default 24)         |
| `{{help_url}}`       | `${WEB_BASE_URL}/help`                              |
| `{{privacy_url}}`    | `${WEB_BASE_URL}/privacy`                           |

Subject: `Verify your CRWLA email`

### `alert-hit.html` — Alert · new hit (user-facing)

Black "LIVE ALERT" header band + single highlighted hit card + meta stats.
Sent when a saved `Alert` (frequency `REALTIME`) matches a fresh `Result`.

| Variable            | Source (`Alert` + matched `Result`)                  |
| ------------------- | ---------------------------------------------------- |
| `{{keyword}}`       | `alert.keyword`                                       |
| `{{hit_title}}`     | `result.title`                                        |
| `{{hit_snippet}}`   | `result.snippet`                                      |
| `{{hit_url}}`       | `result.url`                                          |
| `{{hit_time}}`      | `result.fetchedAt` (formatted)                        |
| `{{source_name}}`   | `result.source`                                       |
| `{{source_initial}}`| 1–2 char badge derived from `result.source`           |
| `{{week_count}}`    | count of results matching this alert in last 7 days   |
| `{{relevance}}`     | `round(result.score * 100)`                           |
| `{{manage_url}}`    | `${WEB_BASE_URL}/alerts/<alert.id>`                   |
| `{{unsubscribe_url}}` | `${WEB_BASE_URL}/alerts/<alert.id>?off=1`           |

Subject: `Alert — new hit on "{{keyword}}"`

### `crawl-digest.html` — Scheduled crawl digest (user-facing)

Deep-green gradient hero with NEW / SCANNED / VS-LAST stats and a
**`{{#each results}}`** loop of top results. Sent after a scheduled `Run`
(from a `Search` whose `cron` ≠ `MANUAL`) finishes with new results.

| Variable           | Source (`Search` + finished `Run`)                    |
| ------------------ | ----------------------------------------------------- |
| `{{job_name}}`     | `search.name`                                          |
| `{{schedule}}`     | `search.cron` (HOURLY / DAILY / WEEKLY, humanised)     |
| `{{new_count}}`    | `run.resultsCount`                                     |
| `{{total_scanned}}`| total results scanned this run                         |
| `{{change_pct}}`   | % change in new results vs the previous run            |
| `{{digest_date}}`  | `run.finishedAt` (formatted)                           |
| `{{next_crawl}}`   | `search.nextRunAt` (formatted)                         |
| `{{dashboard_url}}`| `${WEB_BASE_URL}/searches/<search.id>`                 |
| `{{settings_url}}` | `${WEB_BASE_URL}/searches/<search.id>/settings`        |
| `{{unsubscribe_url}}` | digest opt-out link                                 |
| `{{results}}`      | array of `{ source_initial, source, time, url, title, snippet }`, one per top `Result` |

Subject: `{{new_count}} new results — {{job_name}}`

### `subscription-expiring.html` — Subscription expiring (user-facing)

Warm orange gradient countdown band with a big days-left counter, plan summary
card, and "what happens if you don't renew" warning. Sent N days before
`Subscription.currentPeriodEnd` when renewal is at risk.

| Variable             | Source (`Subscription` + `Plan`)                       |
| -------------------- | ------------------------------------------------------ |
| `{{first_name}}`     | first token of `user.name`                             |
| `{{plan_name}}`      | `plan.name`                                            |
| `{{plan_price}}`     | `plan.priceMonthlyCents`/`priceYearlyCents` formatted  |
| `{{billing_cycle}}`  | `subscription.interval` → `mo` / `yr`                  |
| `{{days_left}}`      | days between now and `currentPeriodEnd`                |
| `{{expiry_date}}`    | `subscription.currentPeriodEnd` (formatted)            |
| `{{autorenew_status}}` | `subscription.cancelAtPeriodEnd` → `off` / `on`      |
| `{{active_crawls}}`  | count of the user's `RUNNING` scheduled searches       |
| `{{grace_days}}`     | grace window from plan config                           |
| `{{features}}`       | array of feature-bullet strings derived from `plan.limits` (rendered via `{{#each}}`) |
| `{{renew_url}}`      | `${WEB_BASE_URL}/billing`                              |
| `{{billing_url}}`    | `${WEB_BASE_URL}/billing`                             |
| `{{help_url}}`       | `${WEB_BASE_URL}/help`                                |

Subject: `Your {{plan_name}} plan expires in {{days_left}} days`

### `contact-notification.html` — contact form alert (support-facing)

Internal notification mailed to `MAIL_SUPPORT_TO` from `ContactService.submit`,
with `replyTo` set to the submitter. Not part of the design set; kept because
it reflects existing app usage. Optional fields use `{{#if}}` blocks.

## How they're sent (implemented)

Rendering + sending is centralised in **`MailerService`** (`src/core/mail/`),
which compiles these files with Handlebars and ships fully-rendered HTML over
SMTP (Mailtrap). One typed method per template:
`sendVerification` / `sendAlertHit` / `sendCrawlDigest` / `sendSubscriptionExpiring`.

The three notification emails are driven by **`NotificationsService`**
(`src/modules/notifications/`) via two BullMQ workers:

| Email                  | Trigger                                                                 | Gate |
| ---------------------- | ----------------------------------------------------------------------- | ---- |
| Verification           | `AuthService.sendVerificationEmail` on signup / resend                  | none |
| Alert — new hit        | `post-run` worker: a **REALTIME** `Alert` matches a new `Result`        | email-supported |
| Scheduled crawl digest | `post-run` worker: a scheduled `Search` (`cron != MANUAL`) run produces new results | email-supported |
| Subscription expiring  | daily `subscription-expiry` sweep, when `currentPeriodEnd` is 7/3/1 days out | none (billing-critical) |

The `post-run` job is enqueued by `ScrapeProcessor` after a run finalises with
new results; the daily sweep is armed in `SchedulerService` (24h repeatable).

**The "email-supported" gate** (`alert-hit` + `crawl-digest`):
`EntitlementsService.canSendEmailAlerts(userId)` — true when the plan's
`limits.emailAlerts !== 0` (FREE includes an allowance, so it passes; a plan
that zeroes email alerts is blocked). On a successful send,
`recordEmailAlertSent` bumps `UsageMeter.emailAlerts` for the period.
Subscription-expiring is **not** gated — it's a renewal notice that must reach
everyone with a lapsing paid plan.

Notes on scope:
- Only **REALTIME** alerts email on hit. `HOURLY`/`DAILY` alerts are intended to
  be batched by a future periodic sweep (not yet wired).
- One alert-hit email per alert per run (the top matching result).

## Notes

- Mailtrap auto-escapes variable values, so the payload needs no manual HTML
  escaping (unlike the inline `buildHtml` fallback in `contact.service.ts`).
- `verify-email.html` parametrises the link TTL as `{{ttl_hours}}` instead of
  the design's hardcoded "24 HOURS", so it tracks `EMAIL_VERIFICATION_TTL_HOURS`.
- `subscription-expiring.html` uses `{{#each features}}` instead of the design's
  fixed `feature_1..3`, since plan feature bullets are derived dynamically from
  `plan.limits`.
- Source of truth for the visual design:
  `google-search-scrape-gss/project/emails/*.html` in the Claude Design handoff.
