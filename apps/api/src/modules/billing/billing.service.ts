import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingInterval,
  Plan,
  PlanTier,
  Subscription,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EntitlementsService } from './entitlements.service';
import { PlansService } from './plans.service';
import { PolarService } from './polar.service';
import { ADDON_CATALOG } from './plans.catalog';

/**
 * Public surface used by the controller. Polar webhook handling lives at
 * the bottom of this class.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
    private readonly polar: PolarService,
    private readonly entitlements: EntitlementsService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Read ----------------------------------------------------

  async listPlans() {
    const plans = await this.plans.listPublic();
    return plans.map((p) => ({
      id: p.id,
      tier: p.tier,
      name: p.name,
      description: p.description,
      priceMonthlyCents: p.priceMonthlyCents,
      priceYearlyCents: p.priceYearlyCents,
      features: p.features,
      limits: p.limits,
      // Don't expose the polar price ids; FE doesn't need them.
      hasPolar:
        !!p.polarPriceMonthlyId || !!p.polarPriceYearlyId || p.tier === 'FREE',
    }));
  }

  async getMine(userId: string) {
    return this.entitlements.ensureFor(userId);
  }

  // ---------- Checkout / Portal --------------------------------------

  async createCheckout(input: {
    userId: string;
    email: string;
    tier: PlanTier;
    interval: BillingInterval;
  }) {
    // Downgrades are scheduled (apply at period end) instead of immediate.
    // Detect "is this a downgrade?" before the Polar-required guard so a
    // user without a Polar token configured can still schedule a downgrade
    // to FREE.
    const downgradeOutcome = await this.maybeScheduleDowngrade(
      input.userId,
      input.tier,
      input.interval,
    );
    if (downgradeOutcome) return downgradeOutcome;

    if (!this.polar.enabled()) {
      throw new BadRequestException(
        'Billing is not configured on this server (missing POLAR_ACCESS_TOKEN).',
      );
    }
    if (input.tier === 'FREE') {
      // No active paid period to honor — downgrade now.
      await this.applyFreeTier(input.userId);
      return { url: null, downgraded: true };
    }
    const plan = await this.plans.byTier(input.tier);
    // Pick the product matching the requested interval. Falls back to the
    // legacy single-product field if the new monthly slot hasn't been
    // populated yet (older rows).
    const productId =
      input.interval === 'YEAR'
        ? plan.polarProductYearlyId
        : plan.polarProductMonthlyId ?? plan.polarProductId;
    if (!productId) {
      throw new BadRequestException(
        `Plan ${plan.name} (${input.interval}) hasn't been synced to Polar yet — ` +
          `open /admin/billing and click Save to provision the product.`,
      );
    }
    const successUrl =
      (this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000') +
      '/billing?status=success';
      
    console.log("🚀 ~ BillingService ~ createCheckout ~ successUrl:", successUrl)

    const checkout = await this.polar.createCheckout({
      productId,
      customerEmail: input.email,
      customerExternalId: input.userId,
      successUrl,
      metadata: {
        userId: input.userId,
        tier: input.tier,
        interval: input.interval,
      },
    });

    return { url: checkout.url, id: checkout.id };
  }

  async createPortal(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    // Polar's customer-session create accepts either `customer_id` or
    // `external_customer_id`. We always have the local userId, so we can
    // open the portal even before the user has completed a checkout — Polar
    // matches the external id when one exists or surfaces a stub portal.
    const session = sub?.polarCustomerId
      ? await this.polar.createCustomerPortal({ customerId: sub.polarCustomerId })
      : await this.polar.createCustomerPortal({ externalCustomerId: userId });
    return { url: (session as { customerPortalUrl?: string }).customerPortalUrl ?? null };
  }

  /**
   * Mark the subscription to cancel at the end of the current period.
   * The actual cancellation is reflected via webhook; this just nudges
   * Polar via the customer portal pattern (or a direct API call if you
   * later add one).
   */
  async requestCancel(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('no subscription');
    if (sub.cancelAtPeriodEnd) return { ok: true };
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });
    return { ok: true };
  }

  // ---------- Webhook event handling ---------------------------------

  /**
   * Dispatch a parsed Polar event. Idempotent on event id when possible —
   * Polar sends retries.
   */
  async handleWebhookEvent(event: PolarEvent): Promise<void> {
    this.logger.log(`polar.webhook ${event.type}`);
    // The PolarEvent union has a catch-all `{ type: string; data: unknown }`
    // member, so TS widens `event.data` inside the case branches. Cast at
    // the dispatch site — payload shape is enforced by the Polar webhook
    // signature check upstream.
    switch (event.type) {
      // Per Polar docs, `subscription.updated` is a catch-all for the other
      // sub state transitions, but we explicitly match each one so future
      // logic can branch (e.g. emit a different in-app notification on
      // `past_due` vs `revoked`).
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active':
      case 'subscription.uncanceled':
      case 'subscription.past_due':
      case 'subscription.revoked':
      case 'subscription.canceled':
        await this.upsertSubscriptionFromWebhook(event.data as PolarSubscriptionPayload);
        break;
      case 'order.created':
      case 'order.paid':
      case 'order.updated':
        await this.handleOrder(event.data as PolarOrderPayload);
        break;
      default:
        this.logger.debug(`ignoring polar event ${event.type}`);
    }
  }

  private async upsertSubscriptionFromWebhook(data: PolarSubscriptionPayload) {
    // Polar's `customer.externalId` is set to our local userId at checkout.
    const userId = data.customer?.externalId ?? null;
    if (!userId) {
      this.logger.warn('polar webhook subscription without externalId — ignored');
      return;
    }
    const tier = mapProductToTier(data, await this.plans.listPublic());
    if (!tier) {
      this.logger.warn(
        `polar webhook product ${data.product?.id} has no matching tier — ignored`,
      );
      return;
    }
    const plan = await this.plans.byTier(tier);
    const status = mapStatus(data.status);
    const interval: BillingInterval =
      data.recurringInterval === 'year' ? 'YEAR' : 'MONTH';

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        planId: plan.id,
        status,
        interval,
        polarSubscriptionId: data.id,
        polarCustomerId: data.customer?.id ?? undefined,
        currentPeriodStart: data.currentPeriodStart
          ? new Date(data.currentPeriodStart)
          : undefined,
        currentPeriodEnd: data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd)
          : undefined,
        cancelAtPeriodEnd: !!data.cancelAtPeriodEnd,
        canceledAt: data.canceledAt ? new Date(data.canceledAt) : null,
        metadata: data as unknown as object,
      },
      create: {
        userId,
        planId: plan.id,
        status,
        interval,
        polarSubscriptionId: data.id,
        polarCustomerId: data.customer?.id ?? null,
        currentPeriodStart: data.currentPeriodStart
          ? new Date(data.currentPeriodStart)
          : null,
        currentPeriodEnd: data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd)
          : null,
        cancelAtPeriodEnd: !!data.cancelAtPeriodEnd,
        metadata: data as unknown as object,
      },
    });

    // Polar is authoritative on period dates. If a scheduled downgrade is
    // pending, re-align its `scheduledFor` to Polar's latest
    // `currentPeriodEnd` so renewal-driven date shifts are honored.
    if (data.currentPeriodEnd) {
      await this.prisma.scheduledPlanChange.updateMany({
        where: { userId, status: 'PENDING' },
        data: { scheduledFor: new Date(data.currentPeriodEnd) },
      });
    }
  }

  private async handleOrder(order: PolarOrderPayload) {
    if (order.status && order.status !== 'paid') return;
    const userId = order.customer?.externalId ?? null;
    if (!userId) return;
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      this.logger.warn(
        `polar order ${order.id} for user ${userId} but no local subscription`,
      );
      return;
    }
    // Add-on kind is read off the Polar product's metadata (`crwlaAddOn`).
    // The admin tags an add-on product with this when they create it in
    // Polar (or via /admin/billing's add-on editor) — no env-var matching.
    const meta = (order.product?.metadata ?? {}) as Record<string, string>;
    const kindRaw = meta.crwlaAddOn;
    if (!kindRaw || !(kindRaw in ADDON_CATALOG)) return;
    const kind = kindRaw as keyof typeof ADDON_CATALOG;

    const exists = await this.prisma.addOn.findUnique({
      where: { polarOrderId: order.id },
    });
    if (exists) return; // idempotency

    const units = ADDON_CATALOG[kind].units;
    await this.prisma.addOn.create({
      data: {
        subscriptionId: sub.id,
        kind,
        quantity: order.quantity ?? 1,
        unitsRemaining: units !== null ? units * (order.quantity ?? 1) : null,
        polarOrderId: order.id,
      },
    });
  }

  /**
   * Public — called both from the immediate-downgrade path in
   * `createCheckout` and from `ScheduledPlanChangesProcessor` when a row's
   * `scheduledFor` has elapsed.
   */
  async applyFreeTier(userId: string) {
    const free = await this.plans.byTier('FREE');
    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        planId: free.id,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        polarSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
      create: {
        userId,
        planId: free.id,
        status: 'ACTIVE',
      },
    });
  }

  // ---------- Scheduled downgrades -----------------------------------

  /**
   * Returns a checkout-shaped response if `tier` is a downgrade and was
   * scheduled, or null if the caller should proceed with the normal
   * upgrade / immediate-downgrade path.
   *
   * "Downgrade" = target plan's `priceMonthlyCents` is strictly less than
   * the user's current plan's. When the user has no active paid period
   * (e.g. they're on FREE or the period has lapsed), we don't schedule —
   * the existing immediate path runs.
   */
  private async maybeScheduleDowngrade(
    userId: string,
    targetTier: PlanTier,
    interval: BillingInterval,
  ): Promise<{ scheduled: true; scheduledFor: number; targetTier: PlanTier } | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) return null; // no current sub = nothing to honor
    if (sub.plan.tier === targetTier) return null; // no-op tier change
    const target = await this.plans.byTier(targetTier);
    if (target.priceMonthlyCents >= sub.plan.priceMonthlyCents) {
      return null; // upgrade or sideways move — caller handles via Polar
    }
    const periodEnd = sub.currentPeriodEnd?.getTime() ?? 0;
    if (periodEnd <= Date.now()) return null; // no paid time left — apply now

    await this.scheduleDowngrade({
      userId,
      currentPlanId: sub.planId,
      targetPlanId: target.id,
      targetInterval: interval,
      scheduledFor: new Date(periodEnd),
    });
    return { scheduled: true, scheduledFor: periodEnd, targetTier };
  }

  /**
   * Replace any prior PENDING change for this user (only one outstanding
   * intent at a time) and insert the new one.
   */
  private async scheduleDowngrade(input: {
    userId: string;
    currentPlanId: string;
    targetPlanId: string;
    targetInterval: BillingInterval;
    scheduledFor: Date;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.scheduledPlanChange.updateMany({
        where: { userId: input.userId, status: 'PENDING' },
        data: { status: 'CANCELED', canceledAt: new Date() },
      }),
      this.prisma.scheduledPlanChange.create({
        data: {
          userId: input.userId,
          currentPlanId: input.currentPlanId,
          targetPlanId: input.targetPlanId,
          targetInterval: input.targetInterval,
          scheduledFor: input.scheduledFor,
          status: 'PENDING',
        },
      }),
    ]);
  }

  /**
   * Cancel the user's outstanding PENDING change, if any. Idempotent —
   * returns ok even when nothing was pending.
   */
  async cancelScheduledChange(userId: string): Promise<{ ok: true; canceled: number }> {
    const out = await this.prisma.scheduledPlanChange.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
    return { ok: true, canceled: out.count };
  }

  /**
   * The currently-pending change for a user, used by EntitlementsService
   * to surface `pendingChange` on `/billing/me`.
   */
  async getPendingChange(userId: string) {
    return this.prisma.scheduledPlanChange.findFirst({
      where: { userId, status: 'PENDING' },
      include: { targetPlan: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// -- helpers / shapes -------------------------------------------------

type PolarEvent =
  | { type: 'subscription.created'; data: PolarSubscriptionPayload }
  | { type: 'subscription.updated'; data: PolarSubscriptionPayload }
  | { type: 'subscription.uncanceled'; data: PolarSubscriptionPayload }
  | { type: 'subscription.past_due'; data: PolarSubscriptionPayload }
  | { type: 'subscription.active'; data: PolarSubscriptionPayload }
  | { type: 'subscription.revoked'; data: PolarSubscriptionPayload }
  | { type: 'subscription.canceled'; data: PolarSubscriptionPayload }
  | { type: 'order.created'; data: PolarOrderPayload }
  | { type: 'order.paid'; data: PolarOrderPayload }
  | { type: 'order.updated'; data: PolarOrderPayload }
  | { type: string; data: unknown };

type PolarSubscriptionPayload = {
  id: string;
  status: string;
  recurringInterval?: 'month' | 'year';
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  customer?: { id: string; externalId?: string | null };
  product?: { id: string };
  productId?: string;
};

type PolarOrderPayload = {
  id: string;
  status?: string;
  quantity?: number;
  customer?: { id: string; externalId?: string | null };
  product?: { id: string; metadata?: Record<string, unknown> };
  productId?: string;
};

function mapStatus(s: string): SubscriptionStatus {
  switch (s) {
    case 'active':
    case 'trialing':
      return s === 'trialing' ? 'TRIALING' : 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
    case 'cancelled':
      return 'CANCELED';
    case 'unpaid':
      return 'UNPAID';
    case 'incomplete':
      return 'INCOMPLETE';
    case 'incomplete_expired':
      return 'INCOMPLETE_EXPIRED';
    default:
      return 'ACTIVE';
  }
}

function mapProductToTier(
  data: PolarSubscriptionPayload,
  plans: Plan[],
): PlanTier | null {
  const productId = data.product?.id ?? data.productId;
  if (!productId) return null;
  // A plan owns up to three product ids (monthly, yearly, legacy alias).
  // Match against any of them — Polar tags `recurring_interval` per product
  // and a single subscription only references one of the two.
  const hit = plans.find(
    (p) =>
      p.polarProductMonthlyId === productId ||
      p.polarProductYearlyId === productId ||
      p.polarProductId === productId,
  );
  return hit?.tier ?? null;
}

