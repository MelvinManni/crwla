import { Injectable, Logger } from '@nestjs/common';
import { AlertFrequency, CronPreset, Result, Alert } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MailerService } from '../../core/mail/mailer.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { deriveFeatures, type PlanLimits } from '../billing/plans.catalog';

/** Days-before-expiry on which the renewal reminder fires (cron runs daily). */
const EXPIRY_THRESHOLDS = [7, 3, 1];
/** Grace window quoted in the expiry email. */
const GRACE_DAYS = 7;
/** Cap on results listed in a digest body. */
const DIGEST_TOP_N = 5;

/**
 * Sends the three user-facing notification emails. Alert-hit and crawl-digest
 * are gated on the plan's email-alert entitlement; subscription-expiring is a
 * billing-critical renewal notice and always sends. Driven by BullMQ
 * processors (post-run + daily expiry sweep) so nothing blocks the scrape path.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ---------- per-run: alert hits + crawl digest ----------------------

  async handlePostRun(input: { searchId: string; runId: string }): Promise<void> {
    const search = await this.prisma.search.findUnique({
      where: { id: input.searchId },
      include: { user: { select: { id: true, email: true, firstName: true, emailVerifiedAt: true } } },
    });
    if (!search || search.deletedAt || !search.user) return;
    // Never email an unverified address — it may be mistyped/undeliverable and
    // the owner hasn't confirmed it. (The verification email is exempt; it's
    // sent from AuthService precisely to get the address confirmed.)
    if (!search.user.emailVerifiedAt) return;

    const run = await this.prisma.run.findUnique({ where: { id: input.runId } });
    if (!run) return;

    const results = await this.prisma.result.findMany({
      where: { runId: input.runId },
      orderBy: [{ score: 'desc' }, { fetchedAt: 'desc' }],
      take: 50,
    });
    if (results.length === 0) return;

    // The same plan flag gates both alert and digest sends.
    const emailAllowed = await this.entitlements.canSendEmailAlerts(search.userId);
    if (!emailAllowed) return;

    await this.sendAlertHits(search.user, search.id, results);
    await this.sendDigest(search, run, results);
  }

  private async sendAlertHits(
    user: { id: string; email: string },
    searchId: string,
    results: Result[],
  ): Promise<void> {
    const alerts = await this.prisma.alert.findMany({
      where: {
        userId: user.id,
        active: true,
        frequency: AlertFrequency.REALTIME,
        OR: [{ searchId }, { searchId: null }],
      },
    });
    if (alerts.length === 0) return;

    let sent = 0;
    for (const alert of alerts) {
      const hit = results.find((r) => matchesAlert(alert, r));
      if (!hit) continue;
      try {
        const weekCount = await this.prisma.result.count({
          where: { searchId, fetchedAt: { gte: daysAgo(7) } },
        });
        await this.mailer.sendAlertHit(user.email, {
          alertId: alert.id,
          keyword: alert.keyword,
          hitTitle: hit.title,
          hitSnippet: hit.snippet ?? '',
          hitUrl: hit.url,
          hitTime: formatDateTime(hit.fetchedAt),
          sourceName: hit.source,
          weekCount,
          relevance: relevanceOf(hit),
        });
        await this.prisma.alert.update({
          where: { id: alert.id },
          data: { lastTriggered: new Date() },
        });
        sent++;
      } catch (e) {
        this.logger.error(`alert-hit email failed (alert ${alert.id}): ${(e as Error).message}`);
      }
    }
    if (sent > 0) await this.entitlements.recordEmailAlertSent(user.id, sent);
  }

  private async sendDigest(
    search: { id: string; userId: string; name: string; cron: CronPreset; nextRunAt: Date | null; user: { email: string } },
    run: { id: string; finishedAt: Date | null; resultsCount: number },
    results: Result[],
  ): Promise<void> {
    // Digest is for scheduled crawls only — manual one-off runs don't send one.
    if (search.cron === CronPreset.MANUAL) return;

    const [totalScanned, prevRun] = await Promise.all([
      this.prisma.result.count({ where: { searchId: search.id } }),
      this.prisma.run.findFirst({
        where: { searchId: search.id, status: 'OK', id: { not: run.id } },
        orderBy: { startedAt: 'desc' },
        select: { resultsCount: true },
      }),
    ]);
    const newCount = run.resultsCount || results.length;
    const prev = prevRun?.resultsCount ?? 0;
    const changePct = prev > 0 ? Math.max(0, Math.round(((newCount - prev) / prev) * 100)) : 100;

    try {
      await this.mailer.sendCrawlDigest(search.user.email, {
        searchId: search.id,
        jobName: search.name,
        schedule: humanizeCron(search.cron),
        newCount,
        totalScanned,
        changePct,
        digestDate: formatDate(run.finishedAt ?? new Date()),
        nextCrawl: search.nextRunAt ? formatDate(search.nextRunAt) : 'soon',
        results: results.slice(0, DIGEST_TOP_N).map((r) => ({
          source: r.source,
          time: formatDateTime(r.fetchedAt),
          url: r.url,
          title: r.title,
          snippet: r.snippet ?? '',
        })),
      });
      await this.entitlements.recordEmailAlertSent(search.userId, 1);
    } catch (e) {
      this.logger.error(`crawl-digest email failed (search ${search.id}): ${(e as Error).message}`);
    }
  }

  // ---------- daily: subscription expiry ------------------------------

  async notifyExpiringSubscriptions(): Promise<{ checked: number; notified: number }> {
    const now = new Date();
    const horizon = daysFromNow(Math.max(...EXPIRY_THRESHOLDS));
    const subs = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        currentPeriodEnd: { not: null, gt: now, lte: horizon },
      },
      include: {
        plan: true,
        user: { select: { id: true, email: true, firstName: true, emailVerifiedAt: true } },
      },
    });

    let notified = 0;
    for (const sub of subs) {
      // Skip unverified addresses — same rule as the per-run notifications.
      if (!sub.currentPeriodEnd || !sub.user || !sub.user.emailVerifiedAt) continue;
      const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / DAY_MS);
      // Fire only on threshold days so the daily sweep doesn't email every day.
      if (!EXPIRY_THRESHOLDS.includes(daysLeft)) continue;

      const limits = sub.plan.limits as unknown as PlanLimits;
      const cents = sub.interval === 'YEAR' ? sub.plan.priceYearlyCents : sub.plan.priceMonthlyCents;
      const activeCrawls = await this.prisma.search.count({
        where: { userId: sub.userId, status: 'RUNNING', deletedAt: null },
      });
      try {
        await this.mailer.sendSubscriptionExpiring(sub.user.email, {
          firstName: sub.user.firstName,
          planName: sub.plan.name,
          planPrice: formatPrice(cents),
          billingCycle: sub.interval === 'YEAR' ? 'yr' : 'mo',
          daysLeft,
          expiryDate: formatDate(sub.currentPeriodEnd),
          autorenewStatus: sub.cancelAtPeriodEnd ? 'off' : 'on',
          activeCrawls,
          graceDays: GRACE_DAYS,
          features: deriveFeatures(limits).slice(0, 3).map((f) => f.label),
        });
        notified++;
      } catch (e) {
        this.logger.error(`subscription-expiring email failed (sub ${sub.id}): ${(e as Error).message}`);
      }
    }
    return { checked: subs.length, notified };
  }
}

// ---------- helpers ---------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function matchesAlert(alert: Alert, r: Result): boolean {
  const kw = alert.keyword.trim().toLowerCase();
  if (kw && !`${r.title} ${r.snippet ?? ''}`.toLowerCase().includes(kw)) return false;
  if (alert.sources.length > 0 && !alert.sources.includes(r.source)) return false;
  if (alert.locations.length > 0 && r.location && !alert.locations.includes(r.location)) return false;
  return true;
}

function relevanceOf(r: Result): number {
  if (r.score == null) return 100;
  return Math.max(0, Math.min(100, Math.round(r.score * 100)));
}

function humanizeCron(cron: CronPreset): string {
  return { HOURLY: 'Hourly', DAILY: 'Daily', WEEKLY: 'Weekly', MANUAL: 'Manual' }[cron] ?? 'Scheduled';
}

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const DATETIME_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function formatDate(d: Date): string {
  return DATE_FMT.format(d);
}
function formatDateTime(d: Date): string {
  return DATETIME_FMT.format(d);
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * DAY_MS);
}
