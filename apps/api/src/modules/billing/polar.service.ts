import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Polar } from '@polar-sh/sdk';

/**
 * Polar SDK wrapper. CRWLA's billing surface uses:
 *   - product CRUD (admin-driven plan editor)
 *   - checkout / customer-portal sessions
 *   - webhook signature validation
 *
 * NB: a Polar subscription product has **one** recurring interval. To offer
 * both monthly and yearly billing on the same plan you'd need two products
 * — admin can create the second one in the Polar dashboard and paste its id
 * into `polarPriceYearlyId` via the editor. For v1 we sync the monthly
 * product automatically and leave yearly as a manual follow-up.
 */
@Injectable()
export class PolarService {
  private readonly logger = new Logger(PolarService.name);
  private client: Polar | null = null;

  constructor(private readonly config: ConfigService) {}

  enabled(): boolean {
    return !!this.config.get<string>('POLAR_ACCESS_TOKEN');
  }

  private getClient(): Polar {
    if (this.client) return this.client;
    const tokenRaw = this.config.get<string>('POLAR_ACCESS_TOKEN');
    const accessToken = tokenRaw?.trim();
    if (!accessToken) {
      throw new Error(
        'POLAR_ACCESS_TOKEN is not set — billing operations are disabled. ' +
          'Set the env var or guard call sites with PolarService.enabled().',
      );
    }
    // Defensive parse: drop inline `# comments` and surrounding quotes that
    // some operators paste into `.env` by accident. Validate server enum
    // explicitly — we'd rather throw than silently route a sandbox token at
    // production and watch it 401.
    const serverRaw = (this.config.get<string>('POLAR_SERVER') ?? 'sandbox')
      .replace(/\s+#.*$/, '')
      .replace(/^['"]|['"]$/g, '')
      .trim();
    if (serverRaw !== 'sandbox' && serverRaw !== 'production') {
      throw new Error(
        `Invalid POLAR_SERVER='${serverRaw}'. Must be 'sandbox' or 'production'. ` +
          `Tip: keep the value bare in .env (no inline # comments, no quotes).`,
      );
    }
    this.client = new Polar({ accessToken, server: serverRaw });
    return this.client;
  }

  // ---------- Products / prices --------------------------------------

  /**
   * Create-or-update the Polar product for a plan. Returns the polar ids so
   * the caller can persist them on the Plan row.
   *
   * On price change: Polar's `update({prices: [...]})` replaces the price
   * list — passing only the new fixed-price payload archives the previous
   * one automatically. This keeps the implementation simple at the cost of
   * not preserving the historical price id (which we don't need — we
   * always check out at the current product price).
   */
  async syncPlan(input: {
    tier: string;
    name: string;
    description?: string | null;
    priceMonthlyCents: number;
    priceYearlyCents: number;
    /** Existing monthly product (formerly stored as `polarProductId`). */
    existingProductMonthlyId?: string | null;
    existingProductYearlyId?: string | null;
    existingPriceMonthlyId?: string | null;
    existingPriceYearlyId?: string | null;
  }): Promise<{
    polarProductMonthlyId: string | null;
    polarProductYearlyId: string | null;
    polarPriceMonthlyId: string | null;
    polarPriceYearlyId: string | null;
  }> {
    // Polar pins one `recurring_interval` per product, so a plan offering
    // both monthly and yearly billing needs two products. We tag each with
    // metadata.crwlaInterval = 'month' | 'year' so the dashboard makes
    // sense when an admin clicks through.
    const monthly = await this.syncOneProduct({
      tier: input.tier,
      name: `${input.name} (Monthly)`,
      description: input.description,
      priceCents: input.priceMonthlyCents,
      interval: 'month',
      existingProductId: input.existingProductMonthlyId,
      existingPriceId: input.existingPriceMonthlyId,
    });
    const yearly =
      input.priceYearlyCents > 0
        ? await this.syncOneProduct({
            tier: input.tier,
            name: `${input.name} (Yearly)`,
            description: input.description,
            priceCents: input.priceYearlyCents,
            interval: 'year',
            existingProductId: input.existingProductYearlyId,
            existingPriceId: input.existingPriceYearlyId,
          })
        : { productId: null, priceId: null };

    return {
      polarProductMonthlyId: monthly.productId,
      polarProductYearlyId: yearly.productId,
      polarPriceMonthlyId: monthly.priceId,
      polarPriceYearlyId: yearly.priceId,
    };
  }

  /**
   * Single-interval product upsert. Updates the product in place when an id
   * is supplied; recreates if the existing one is missing/archived. Polar's
   * `update({ prices })` replaces the price list, archiving any not present
   * — so passing one new price is enough to roll the price.
   */
  private async syncOneProduct(input: {
    tier: string;
    name: string;
    description?: string | null;
    priceCents: number;
    interval: 'month' | 'year';
    existingProductId: string | null | undefined;
    existingPriceId: string | null | undefined;
  }): Promise<{ productId: string | null; priceId: string | null }> {
    const polar = this.getClient();

    const buildPrice = () =>
      input.priceCents > 0
        ? [
            {
              amountType: 'fixed',
              priceAmount: input.priceCents,
              priceCurrency: 'usd',
            },
          ]
        : [{ amountType: 'free' }];

    let productId = input.existingProductId ?? null;
    if (productId) {
      try {
        const updated = (await polar.products.update({
          id: productId,
          productUpdate: {
            name: input.name,
            description: input.description ?? undefined,
            prices: buildPrice(),
          } as never,
        })) as { id: string; prices?: Array<{ id: string }> };
        return {
          productId: updated.id,
          priceId: updated.prices?.[0]?.id ?? null,
        };
      } catch (e) {
        this.logger.warn(
          `polar product update failed (${productId}); recreating: ${(e as Error).message}`,
        );
        productId = null;
      }
    }

    const created = (await polar.products.create({
      name: input.name,
      description: input.description ?? undefined,
      recurringInterval: input.interval,
      metadata: { crwlaTier: input.tier, crwlaInterval: input.interval },
      prices: buildPrice(),
    } as never)) as { id: string; prices?: Array<{ id: string }> };

    return {
      productId: created.id,
      priceId: created.prices?.[0]?.id ?? null,
    };
  }

  async archiveProduct(productId: string): Promise<void> {
    const polar = this.getClient();
    try {
      await polar.products.update({
        id: productId,
        productUpdate: { isArchived: true } as never,
      });
    } catch (e) {
      this.logger.warn(`archive product ${productId} failed: ${(e as Error).message}`);
    }
  }

  async restoreProduct(productId: string): Promise<void> {
    const polar = this.getClient();
    try {
      await polar.products.update({
        id: productId,
        productUpdate: { isArchived: false } as never,
      });
    } catch (e) {
      this.logger.warn(`restore product ${productId} failed: ${(e as Error).message}`);
    }
  }

  // ---------- Checkout / Portal --------------------------------------

  async createCheckout(input: {
    productId: string;
    customerEmail: string;
    customerExternalId: string;
    successUrl: string;
    metadata?: Record<string, string>;
  }) {
    const polar = this.getClient();
    return polar.checkouts.create({
      products: [input.productId],
      customerEmail: input.customerEmail,
      // Polar renamed this field; the local arg keeps the conventional name.
      externalCustomerId: input.customerExternalId,
      successUrl: input.successUrl,
      metadata: input.metadata ?? {},
    });
  }

  async createCustomerPortal(input: { customerId?: string; externalCustomerId?: string }) {
    const polar = this.getClient();
    if (!input.customerId && !input.externalCustomerId) {
      throw new Error('createCustomerPortal: customerId or externalCustomerId required');
    }
    // Polar's CustomerSessionCreate is a union: pass exactly one of the two
    // id forms. With externalCustomerId, Polar matches the local user id we
    // set during checkout — see https://polar.sh/docs/api-reference/customer-portal/sessions/create
    const body = input.customerId
      ? { customerId: input.customerId }
      : { externalCustomerId: input.externalCustomerId };
    return polar.customerSessions.create(body as never);
  }

  // ---------- Webhook ------------------------------------------------

  /**
   * Validate a Polar webhook payload using the SDK's `validateEvent`. The
   * subpath import (`@polar-sh/sdk/webhooks`) lives outside TS's classic
   * module-resolution view, so we resolve it via `require` at runtime and
   * cast the surface — pure boilerplate, the function signature is what
   * matters.
   */
  async validateWebhook(rawBody: Buffer, headers: Record<string, string>) {
    const secret = this.config.get<string>('POLAR_WEBHOOK_SECRET');
    if (!secret) throw new Error('POLAR_WEBHOOK_SECRET not set');
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
    const webhooks = require('@polar-sh/sdk/webhooks') as {
      validateEvent: (
        body: string | Buffer,
        headers: Record<string, string>,
        secret: string,
      ) => unknown;
      WebhookVerificationError: { new (m: string): Error };
    };
    try {
      return webhooks.validateEvent(rawBody, headers, secret);
    } catch (e) {
      if (e instanceof webhooks.WebhookVerificationError) {
        this.logger.warn(`webhook signature failed: ${(e as Error).message}`);
      }
      throw e;
    }
  }
}
