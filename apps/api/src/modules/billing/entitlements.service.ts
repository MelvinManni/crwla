import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  AddOnKind,
  Plan,
  Subscription,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PlansService } from './plans.service';
import type { PlanLimits } from './plans.catalog';

const ACTIVE_STATUSES: SubscriptionStatus[] = ['TRIALING', 'ACTIVE'];

/**
 * The shape used by all callers — no Prisma types leak out so the same
 * object is safe to send to the FE.
 */
export type Entitlements = {
  plan: { id: string; tier: string; name: string };
  status: SubscriptionStatus;
  interval: 'MONTH' | 'YEAR';
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  /** Aggregated extras from active AddOns. */
  bonus: {
    extraManualRuns: number;
    extraSms: number;
    extraSeats: number;
  };
  usage: {
    period: string;
    manualRuns: number;
    scheduledRuns: number;
    emailAlerts: number;
    smsAlerts: number;
    whatsappAlerts: number;
    csvExports: number;
    pricingCrawlaSearches: number;
    jobSearches: number;
  };
  /**
   * The user's outstanding PENDING ScheduledPlanChange, if any. The FE
   * uses this to render a "Scheduled to switch to X on Y" banner with a
   * Cancel action. `null` when no downgrade is pending.
   */
  pendingChange: {
    targetTier: string;
    targetPlanName: string;
    targetInterval: 'MONTH' | 'YEAR';
    scheduledFor: number;
  } | null;
};

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
  ) {}

  // ---------- Read ----------------------------------------------------

  async forUser(userId: string): Promise<Entitlements> {
    const sub = await this.activeSubscription(userId);
    return this.assemble(sub);
  }

  /**
   * Same as forUser but auto-creates a FREE subscription if none exists.
   * Use this in flows that need a sub row to attach usage / add-ons to
   * (e.g. immediately after sign-up).
   */
  async ensureFor(userId: string): Promise<Entitlements> {
    let sub = await this.activeSubscription(userId);
    if (!sub) sub = await this.createFreeSubscription(userId);
    return this.assemble(sub);
  }

  async createFreeSubscription(userId: string): Promise<Subscription & { plan: Plan }> {
    const plan = await this.plans.byTier('FREE');
    return this.prisma.subscription.upsert({
      where: { userId },
      update: {}, // never touch an existing one — caller should pick a different flow
      create: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        interval: 'MONTH',
      },
      include: { plan: true },
    });
  }

  // ---------- Asserts (use from feature services) ---------------------

  async assertCanCreateSearch(userId: string): Promise<void> {
    const ent = await this.ensureFor(userId);
    const cap = ent.limits.savedSearches;
    if (cap < 0) return;
    const used = await this.prisma.search.count({ where: { userId, deletedAt: null } });
    if (used >= cap) {
      throw this.limitError(`Saved searches limit reached (${cap}). Upgrade your plan to add more.`);
    }
  }

  async assertCanAddKeywords(userId: string, totalCount: number): Promise<void> {
    const ent = await this.ensureFor(userId);
    if (totalCount > ent.limits.keywordsPerSearch) {
      throw this.limitError(
        `${ent.plan.name} allows ${ent.limits.keywordsPerSearch} keywords per search; you supplied ${totalCount}.`,
      );
    }
    if (totalCount > ent.limits.bulkKeywordImport) {
      throw this.limitError(
        `${ent.plan.name} allows ${ent.limits.bulkKeywordImport} keywords per bulk import; you supplied ${totalCount}.`,
      );
    }
  }

  async assertCronAllowed(userId: string, cron: string): Promise<void> {
    const ent = await this.ensureFor(userId);
    if (!ent.limits.cron.includes(cron as PlanLimits['cron'][number])) {
      throw this.limitError(
        `${ent.plan.name} doesn't allow ${cron.toLowerCase()} scheduling. Available: ${ent.limits.cron.join(', ')}.`,
      );
    }
  }

  /**
   * Manual-run accounting. Decrements bonus packs first; if no bonus is
   * available and the plan limit is hit, throws. Returns true on success.
   */
  async consumeManualRun(userId: string): Promise<void> {
    const sub = await this.requireSubscription(userId);
    const ent = await this.assemble(sub);
    const cap = ent.limits.manualRunsPerMonth;
    const usedThisPeriod = ent.usage.manualRuns;
    const allowance = cap < 0 ? Infinity : cap + ent.bonus.extraManualRuns;
    if (usedThisPeriod >= allowance) {
      throw this.limitError(
        `Manual run quota reached (${ent.usage.manualRuns}/${allowance === Infinity ? '∞' : allowance}). ` +
          `Add a run pack ($5 / 30 runs) or upgrade.`,
      );
    }
    // Prefer to consume a bonus pack unit when present so plan-included
    // runs aren't burned while the user has paid extras.
    if (await this.tryConsumeAddOn(sub.id, 'EXTRA_RUN_PACK')) {
      await this.bumpUsage(sub.id, { manualRuns: 1 });
      return;
    }
    await this.bumpUsage(sub.id, { manualRuns: 1 });
  }

  async assertCanCreateAlert(userId: string): Promise<void> {
    const ent = await this.ensureFor(userId);
    if (ent.limits.emailAlerts < 0) return;
    const used = await this.prisma.alert.count({ where: { userId } });
    if (used >= ent.limits.emailAlerts) {
      throw this.limitError(
        `Alert limit reached (${ent.limits.emailAlerts}). Upgrade for more.`,
      );
    }
  }

  async assertExportFormat(userId: string, format: string): Promise<void> {
    const ent = await this.ensureFor(userId);
    if (!ent.limits.exportFormats.includes(format as PlanLimits['exportFormats'][number])) {
      throw this.limitError(
        `${ent.plan.name} doesn't include ${format.toUpperCase()} export.`,
      );
    }
  }

  // Note: boolean-flag asserts (webhooks, result_sharing, pricing_crawla,
  // job_search, etc.) live in FeatureAccessService. Inject that and call
  // `features.require(userId, '<feature_key>')` instead of writing a new
  // method here.

  // ---------- Internals -----------------------------------------------

  private async activeSubscription(
    userId: string,
  ): Promise<(Subscription & { plan: Plan }) | null> {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: ACTIVE_STATUSES } },
      include: { plan: true },
    });
  }

  private async requireSubscription(userId: string) {
    const sub = await this.activeSubscription(userId);
    if (sub) return sub;
    return this.createFreeSubscription(userId);
  }

  private async assemble(
    sub: (Subscription & { plan: Plan }) | null,
  ): Promise<Entitlements> {
    if (!sub) {
      const free = this.plans.defByTier('FREE');
      return {
        plan: { id: 'free-virtual', tier: 'FREE', name: free.name },
        status: 'ACTIVE',
        interval: 'MONTH',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        limits: free.limits,
        bonus: { extraManualRuns: 0, extraSms: 0, extraSeats: 0 },
        usage: emptyUsage(),
        pendingChange: null,
      };
    }

    const limits = sub.plan.limits as unknown as PlanLimits;
    const meter = await this.currentMeter(sub.id);
    const bonus = await this.aggregateAddOns(sub.id);
    const pendingChange = await this.pendingChangeFor(sub.userId);

    return {
      plan: { id: sub.plan.id, tier: sub.plan.tier, name: sub.plan.name },
      status: sub.status,
      interval: sub.interval,
      currentPeriodEnd: sub.currentPeriodEnd?.getTime() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      limits,
      bonus,
      usage: {
        period: meter.period,
        manualRuns: meter.manualRuns,
        scheduledRuns: meter.scheduledRuns,
        emailAlerts: meter.emailAlerts,
        smsAlerts: meter.smsAlerts,
        whatsappAlerts: meter.whatsappAlerts,
        csvExports: meter.csvExports,
        pricingCrawlaSearches: meter.pricingCrawlaSearches,
        jobSearches: meter.jobSearches,
      },
      pendingChange,
    };
  }

  private async pendingChangeFor(
    userId: string,
  ): Promise<Entitlements['pendingChange']> {
    const row = await this.prisma.scheduledPlanChange.findFirst({
      where: { userId, status: 'PENDING' },
      include: { targetPlan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    return {
      targetTier: row.targetPlan.tier,
      targetPlanName: row.targetPlan.name,
      targetInterval: row.targetInterval,
      scheduledFor: row.scheduledFor.getTime(),
    };
  }

  private async currentMeter(subscriptionId: string) {
    const { period, periodStart, periodEnd } = currentPeriod();
    return this.prisma.usageMeter.upsert({
      where: { subscriptionId_period: { subscriptionId, period } },
      update: {},
      create: { subscriptionId, period, periodStart, periodEnd },
    });
  }

  /**
   * Atomic per-period counter increment. Public so FeatureAccessService
   * (and any future feature-specific service) can bump usage without
   * reimplementing the upsert. Pass any subset of counter deltas; missing
   * ones default to 0.
   */
  async incrementUsage(
    subscriptionId: string,
    deltas: Partial<{
      manualRuns: number;
      scheduledRuns: number;
      emailAlerts: number;
      smsAlerts: number;
      whatsappAlerts: number;
      csvExports: number;
      pricingCrawlaSearches: number;
      jobSearches: number;
    }>,
  ): Promise<void> {
    return this.bumpUsage(subscriptionId, deltas);
  }

  /**
   * Resolve the active subscription (creating a FREE one if missing).
   * Exposed so FeatureAccessService can attach add-ons / usage bumps to
   * the right subscription row.
   */
  async resolveSubscription(userId: string) {
    return this.requireSubscription(userId);
  }

  private async bumpUsage(
    subscriptionId: string,
    deltas: Partial<{
      manualRuns: number;
      scheduledRuns: number;
      emailAlerts: number;
      smsAlerts: number;
      whatsappAlerts: number;
      csvExports: number;
      pricingCrawlaSearches: number;
      jobSearches: number;
    }>,
  ) {
    const { period, periodStart, periodEnd } = currentPeriod();
    await this.prisma.usageMeter.upsert({
      where: { subscriptionId_period: { subscriptionId, period } },
      update: {
        manualRuns: { increment: deltas.manualRuns ?? 0 },
        scheduledRuns: { increment: deltas.scheduledRuns ?? 0 },
        emailAlerts: { increment: deltas.emailAlerts ?? 0 },
        smsAlerts: { increment: deltas.smsAlerts ?? 0 },
        whatsappAlerts: { increment: deltas.whatsappAlerts ?? 0 },
        csvExports: { increment: deltas.csvExports ?? 0 },
        pricingCrawlaSearches: { increment: deltas.pricingCrawlaSearches ?? 0 },
        jobSearches: { increment: deltas.jobSearches ?? 0 },
      },
      create: {
        subscriptionId,
        period,
        periodStart,
        periodEnd,
        manualRuns: deltas.manualRuns ?? 0,
        scheduledRuns: deltas.scheduledRuns ?? 0,
        emailAlerts: deltas.emailAlerts ?? 0,
        smsAlerts: deltas.smsAlerts ?? 0,
        whatsappAlerts: deltas.whatsappAlerts ?? 0,
        csvExports: deltas.csvExports ?? 0,
        pricingCrawlaSearches: deltas.pricingCrawlaSearches ?? 0,
        jobSearches: deltas.jobSearches ?? 0,
      },
    });
  }

  private async aggregateAddOns(subscriptionId: string) {
    const now = new Date();
    const rows = await this.prisma.addOn.findMany({
      where: {
        subscriptionId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    let extraManualRuns = 0;
    let extraSms = 0;
    let extraSeats = 0;
    for (const r of rows) {
      if (r.kind === 'EXTRA_RUN_PACK') extraManualRuns += r.unitsRemaining ?? 0;
      else if (r.kind === 'EXTRA_SMS_PACK') extraSms += r.unitsRemaining ?? 0;
      else if (r.kind === 'EXTRA_SEAT') extraSeats += r.quantity;
    }
    return { extraManualRuns, extraSms, extraSeats };
  }

  /** Atomically decrement one unit from the oldest unexpired pack. */
  private async tryConsumeAddOn(
    subscriptionId: string,
    kind: AddOnKind,
  ): Promise<boolean> {
    const now = new Date();
    const pack = await this.prisma.addOn.findFirst({
      where: {
        subscriptionId,
        kind,
        unitsRemaining: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { purchasedAt: 'asc' },
    });
    if (!pack) return false;
    // Race-safe: conditional update returns count=0 if another worker
    // grabbed the last unit between the find and the update.
    const updated = await this.prisma.addOn.updateMany({
      where: { id: pack.id, unitsRemaining: { gt: 0 } },
      data: { unitsRemaining: { decrement: 1 } },
    });
    return updated.count > 0;
  }

  private limitError(message: string): ForbiddenException {
    // Filter pulls `.message` and `.code` onto the response body, so the
    // FE sees `{ error: '...', code: 'PLAN_LIMIT_EXCEEDED', ... }`.
    return new ForbiddenException({ message, code: 'PLAN_LIMIT_EXCEEDED' });
  }
}

function currentPeriod(): { period: string; periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const period = `${y}-${String(m + 1).padStart(2, '0')}`;
  const periodStart = new Date(Date.UTC(y, m, 1));
  const periodEnd = new Date(Date.UTC(y, m + 1, 1));
  return { period, periodStart, periodEnd };
}

function emptyUsage(): Entitlements['usage'] {
  return {
    period: currentPeriod().period,
    manualRuns: 0,
    scheduledRuns: 0,
    emailAlerts: 0,
    smsAlerts: 0,
    whatsappAlerts: 0,
    csvExports: 0,
    pricingCrawlaSearches: 0,
    jobSearches: 0,
  };
}
