import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { PolarService } from './polar.service';
import { BillingInterval, PlanTier } from '@prisma/client';

class CheckoutDto {
  @IsIn(['FREE', 'STARTER', 'BASIC', 'PRO', 'BUSINESS'])
  tier!: PlanTier;
  @IsOptional() @IsIn(['MONTH', 'YEAR']) interval?: BillingInterval;
}

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly polar: PolarService,
  ) {}

  @Get('plans')
  plans() {
    return this.billing.listPlans().then((plans) => ({ plans }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.getMine(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  @HttpCode(200)
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutDto) {
    return this.billing.createCheckout({
      userId: user.id,
      email: user.email,
      tier: dto.tier,
      interval: dto.interval ?? 'MONTH',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('portal')
  @HttpCode(200)
  portal(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.createPortal(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.requestCancel(user.id);
  }

  /**
   * Cancel an outstanding scheduled downgrade. Idempotent — returns
   * `{ ok: true, canceled: 0 }` when nothing was pending.
   */
  @UseGuards(JwtAuthGuard)
  @Post('scheduled-change/cancel')
  @HttpCode(200)
  cancelScheduledChange(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.cancelScheduledChange(user.id);
  }

  /**
   * Polar webhook receiver. Public (no JWT) — auth is the HMAC signature
   * Polar sends in the `webhook-signature` header. The raw body must be
   * forwarded verbatim, see `main.ts` for the JSON-bypass setup.
   */
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: Request) {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers[k.toLowerCase()] = v;
    }
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!raw) {
      throw new Error('webhook raw body missing — check main.ts json verify hook');
    }
    const event = await this.polar.validateWebhook(raw, headers);
    await this.billing.handleWebhookEvent(event as unknown as never);
    return { ok: true };
  }
}
