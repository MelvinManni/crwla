import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Plan, PlanTier, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PolarService } from './polar.service';
import {
  PLAN_CATALOG,
  planByTier,
  type PlanDefinition,
  type PlanLimits,
} from './plans.catalog';

/**
 * Plans live in the DB and are admin-editable. The first time the API boots
 * against an empty database, `seedIfEmpty()` writes the canonical catalog so
 * there's something for the admin to edit. After that, `plans.catalog.ts` is
 * just a reference template — admin changes win.
 *
 * Polar product/price ids are provisioned automatically on save via
 * `PolarService.syncPlan()`. No env-supplied ids needed.
 */
@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly polar: PolarService,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  /** Bootstrap: only inserts when the table is empty. */
  async seedIfEmpty() {
    const count = await this.prisma.plan.count();
    if (count > 0) return;
    for (const def of PLAN_CATALOG) {
      await this.prisma.plan.create({
        data: defToCreate(def),
      });
    }
    this.logger.log(`seeded ${PLAN_CATALOG.length} plans (empty DB bootstrap)`);
  }

  /** Active, picker-visible plans for end users. */
  async listPublic(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Admin view — includes archived. */
  async listAll(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async byId(id: string): Promise<Plan> {
    const p = await this.prisma.plan.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`plan ${id} not found`);
    return p;
  }

  async byTier(tier: PlanTier): Promise<Plan> {
    const p = await this.prisma.plan.findUnique({ where: { tier } });
    if (!p) {
      throw new Error(
        `Plan not seeded for tier ${tier} — call PlansService.seedIfEmpty() or insert via admin.`,
      );
    }
    return p;
  }

  defByTier(tier: PlanTier): PlanDefinition {
    return planByTier(tier);
  }

  // ---------- Admin write operations --------------------------------

  /**
   * Create a brand-new plan for an unused tier. Tier must be unique. Polar
   * product is created synchronously when `polarSync = true` (default) and
   * Polar is configured.
   */
  async create(input: AdminPlanInput & { polarSync?: boolean }): Promise<Plan> {
    const exists = await this.prisma.plan.findUnique({ where: { tier: input.tier } });
    if (exists) {
      throw new BadRequestException(
        `Tier ${input.tier} already exists — edit the existing plan instead.`,
      );
    }
    const created = await this.prisma.plan.create({
      data: this.buildPersistData(input),
    });
    if (input.polarSync !== false && this.polar.enabled() && created.tier !== 'FREE') {
      return this.syncWithPolar(created.id);
    }
    return created;
  }

  /** Patch any subset of plan fields. Triggers Polar sync unless suppressed. */
  /**
   * Patch any subset of plan fields. Triggers a Polar sync (unless
   * suppressed) which:
   *   - creates the Polar product when `polarProductId` is null,
   *   - updates name/description/price otherwise.
   *
   * Polar errors don't fail the save — the local row is persisted and the
   * error is returned alongside as `polarSyncError` so the admin UI can show
   * a partial-success banner. Pass `polarSyncStrict: true` to throw instead.
   */
  async update(
    id: string,
    input: Partial<AdminPlanInput> & {
      polarSync?: boolean;
      polarSyncStrict?: boolean;
    },
  ): Promise<Plan & { polarSyncError?: string }> {
    const existing = await this.byId(id);
    const data: Prisma.PlanUpdateInput = {};
    if (typeof input.name === 'string') data.name = input.name;
    if (typeof input.description === 'string') data.description = input.description;
    if (typeof input.priceMonthlyCents === 'number')
      data.priceMonthlyCents = input.priceMonthlyCents;
    if (typeof input.priceYearlyCents === 'number')
      data.priceYearlyCents = input.priceYearlyCents;
    if (typeof input.sortOrder === 'number') data.sortOrder = input.sortOrder;
    if (typeof input.active === 'boolean') data.active = input.active;
    if (input.limits) data.limits = input.limits as Prisma.InputJsonValue;
    if (input.features)
      data.features = input.features as unknown as Prisma.InputJsonValue;

    const updated = await this.prisma.plan.update({ where: { id }, data });

    const shouldSync = input.polarSync !== false && existing.tier !== 'FREE';
    if (!shouldSync) return updated;

    if (!this.polar.enabled()) {
      return Object.assign(updated, {
        polarSyncError: 'POLAR_ACCESS_TOKEN not configured on the server',
      });
    }

    try {
      return await this.syncWithPolar(id);
    } catch (e) {
      this.logger.warn(
        `polar sync failed for plan ${id}: ${(e as Error).message}`,
      );
      if (input.polarSyncStrict) throw e;
      return Object.assign(updated, { polarSyncError: (e as Error).message });
    }
  }

  /** Soft-delete: set active=false and archive the Polar product. */
  async archive(id: string): Promise<Plan> {
    const plan = await this.byId(id);
    if (plan.polarProductId && this.polar.enabled()) {
      await this.polar.archiveProduct(plan.polarProductId);
    }
    return this.prisma.plan.update({ where: { id }, data: { active: false } });
  }

  /** Inverse of archive. */
  async restore(id: string): Promise<Plan> {
    const plan = await this.byId(id);
    if (plan.polarProductId && this.polar.enabled()) {
      await this.polar.restoreProduct(plan.polarProductId);
    }
    return this.prisma.plan.update({ where: { id }, data: { active: true } });
  }

  /**
   * Idempotent — runs the Polar create-or-update flow and persists the
   * returned product/price ids back onto the Plan row. Safe to call many
   * times; powers the "Sync to Polar" button in the admin UI.
   */
  async syncWithPolar(id: string): Promise<Plan> {
    const plan = await this.byId(id);
    if (plan.tier === 'FREE') return plan;
    if (!this.polar.enabled()) {
      throw new BadRequestException(
        'Polar is not configured (POLAR_ACCESS_TOKEN missing) — cannot sync product.',
      );
    }
    let out;
    try {
      out = await this.polar.syncPlan({
        tier: plan.tier,
        name: plan.name,
        description: plan.description,
        priceMonthlyCents: plan.priceMonthlyCents,
        priceYearlyCents: plan.priceYearlyCents,
        // Read from the new monthly field; fall back to legacy polarProductId
        // so older rows keep working without manual fix-up.
        existingProductMonthlyId:
          plan.polarProductMonthlyId ?? plan.polarProductId,
        existingProductYearlyId: plan.polarProductYearlyId,
        existingPriceMonthlyId: plan.polarPriceMonthlyId,
        existingPriceYearlyId: plan.polarPriceYearlyId,
      });
    } catch (e) {
      // Translate Polar's auth errors into actionable hints. The SDK
      // wraps HTTP responses; the body string contains the upstream JSON.
      const msg = String((e as Error)?.message ?? e);
      if (/401|invalid_token|unauthorized/i.test(msg)) {
        throw new BadRequestException(
          'Polar rejected the access token (401). Check POLAR_ACCESS_TOKEN ' +
            'matches POLAR_SERVER (sandbox token vs sandbox server, or production with production), ' +
            'and that the token has not been revoked.',
        );
      }
      if (/403|forbidden/i.test(msg)) {
        throw new BadRequestException(
          'Polar rejected the access token (403). The token is valid but lacks the ' +
            'required scopes — re-create it with at least products:write and checkouts:write.',
        );
      }
      throw e;
    }
    return this.prisma.plan.update({
      where: { id },
      data: {
        polarProductMonthlyId: out.polarProductMonthlyId,
        polarProductYearlyId: out.polarProductYearlyId,
        polarPriceMonthlyId: out.polarPriceMonthlyId,
        polarPriceYearlyId: out.polarPriceYearlyId,
        // Keep the legacy field in sync with the monthly product so any
        // code still reading `polarProductId` continues to work.
        polarProductId: out.polarProductMonthlyId,
      },
    });
  }

  private buildPersistData(input: AdminPlanInput): Prisma.PlanUncheckedCreateInput {
    return {
      tier: input.tier,
      name: input.name,
      description: input.description ?? null,
      priceMonthlyCents: input.priceMonthlyCents ?? 0,
      priceYearlyCents: input.priceYearlyCents ?? 0,
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
      limits: (input.limits ?? planByTier(input.tier).limits) as Prisma.InputJsonValue,
      features: (input.features ??
        planByTier(input.tier).features) as unknown as Prisma.InputJsonValue,
    };
  }
}

export type AdminPlanInput = {
  tier: PlanTier;
  name: string;
  description?: string | null;
  priceMonthlyCents?: number;
  priceYearlyCents?: number;
  sortOrder?: number;
  active?: boolean;
  limits?: PlanLimits;
  features?: string[];
};

function defToCreate(def: PlanDefinition): Prisma.PlanUncheckedCreateInput {
  return {
    tier: def.tier,
    name: def.name,
    description: def.description,
    priceMonthlyCents: def.priceMonthlyCents,
    priceYearlyCents: def.priceYearlyCents,
    sortOrder: def.sortOrder,
    limits: def.limits as unknown as Prisma.InputJsonValue,
    features: def.features as unknown as Prisma.InputJsonValue,
    active: true,
  };
}
