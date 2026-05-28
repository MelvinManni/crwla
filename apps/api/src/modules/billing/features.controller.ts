import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { FeatureAccessService } from './feature-access.service';
import { ALL_FEATURE_KEYS, type FeatureKey } from './features.registry';

@UseGuards(JwtAuthGuard)
@Controller('features')
export class FeaturesController {
  constructor(private readonly features: FeatureAccessService) {}

  /**
   * Bulk access map. The FE calls this once on (app)-layout mount to
   * drive sidebar gating, upgrade cards, and `<PlanLock />` badges
   * without a round-trip per feature.
   *
   * Shape:
   * {
   *   keys: ["pricing_crawla", "job_search", ...],
   *   access: {
   *     pricing_crawla: { allowed, reason, label, requiresLabel, quotaUsed, quotaCap },
   *     ...
   *   }
   * }
   */
  @Get('access')
  async access(@CurrentUser() user: AuthenticatedUser) {
    const access = await this.features.accessMap(user.id);
    return { keys: ALL_FEATURE_KEYS, access };
  }

  /** Per-key check — useful for ad-hoc server components. */
  @Get(':key')
  async check(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
  ) {
    if (!(ALL_FEATURE_KEYS as readonly string[]).includes(key)) {
      return { allowed: false, reason: `Unknown feature key: ${key}` };
    }
    return this.features.check(user.id, key as FeatureKey);
  }
}
