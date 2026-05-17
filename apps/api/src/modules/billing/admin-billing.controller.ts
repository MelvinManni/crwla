import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Plan, PlanTier } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PlansService } from './plans.service';
import { PolarService } from './polar.service';
import { deriveFeatures, type PlanLimits } from './plans.catalog';

class CreatePlanDto {
  @IsIn(['FREE', 'STARTER', 'BASIC', 'PRO', 'BUSINESS']) tier!: PlanTier;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) priceMonthlyCents?: number;
  @IsOptional() @IsInt() @Min(0) priceYearlyCents?: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsObject() limits?: Record<string, unknown>;
  @IsOptional() @IsBoolean() polarSync?: boolean;
}

class UpdatePlanDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) priceMonthlyCents?: number;
  @IsOptional() @IsInt() @Min(0) priceYearlyCents?: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsObject() limits?: Record<string, unknown>;
  @IsOptional() @IsBoolean() polarSync?: boolean;
}

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/billing/plans')
export class AdminBillingController {
  constructor(
    private readonly plans: PlansService,
    private readonly polar: PolarService,
  ) {}

  @Get()
  async list() {
    const plans = await this.plans.listAll();
    return {
      plans: plans.map(shapeAdminPlan),
      polar: { configured: this.polar.enabled() },
    };
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreatePlanDto) {
    return shapeAdminPlan(await this.plans.create(dto as never));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    const updated = await this.plans.update(id, dto as never);
    const { polarSyncError, ...rest } = updated;
    return { ...shapeAdminPlan(rest), polarSyncError };
  }

  @Post(':id/archive')
  @HttpCode(200)
  async archive(@Param('id') id: string) {
    return shapeAdminPlan(await this.plans.archive(id));
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restore(@Param('id') id: string) {
    return shapeAdminPlan(await this.plans.restore(id));
  }

  @Post(':id/sync-polar')
  @HttpCode(200)
  async syncPolar(@Param('id') id: string) {
    return shapeAdminPlan(await this.plans.syncWithPolar(id));
  }
}

// Inject the derived feature bullets so the admin FE renders them
// without doing its own derivation. Single source of truth: `limits`.
function shapeAdminPlan(plan: Plan) {
  return {
    ...plan,
    features: deriveFeatures(plan.limits as unknown as PlanLimits),
  };
}
