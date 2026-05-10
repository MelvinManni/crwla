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
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PlanTier } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PlansService } from './plans.service';
import { PolarService } from './polar.service';

class CreatePlanDto {
  @IsIn(['FREE', 'STARTER', 'BASIC', 'PRO', 'BUSINESS']) tier!: PlanTier;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) priceMonthlyCents?: number;
  @IsOptional() @IsInt() @Min(0) priceYearlyCents?: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsObject() limits?: Record<string, unknown>;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
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
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  features?: string[];
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
    // Surface Polar connection state so the admin UI can show a banner.
    return {
      plans,
      polar: { configured: this.polar.enabled() },
    };
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePlanDto) {
    return this.plans.create(dto as never);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto as never);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@Param('id') id: string) {
    return this.plans.archive(id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id') id: string) {
    return this.plans.restore(id);
  }

  @Post(':id/sync-polar')
  @HttpCode(200)
  syncPolar(@Param('id') id: string) {
    return this.plans.syncWithPolar(id);
  }
}
