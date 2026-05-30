import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { LlmExtractorService } from './llm.service';

class ExtractDto {
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() html?: string;
  @IsString() @MinLength(3) goal!: string;
  @IsOptional() @IsObject() schema?: Record<string, unknown>;
  @IsOptional() @IsString() bucket?: string;
}

class SearchProductsDto {
  @IsString() @MinLength(2) query!: string;
  @IsOptional() @IsInt() @Min(1) @Max(10) pages?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsInt() @Min(1) @Max(16) concurrency?: number;
  @IsOptional() @IsBoolean() useLlmFallback?: boolean;
}

/**
 * Admin-only debug surface for the LLM service. Useful for sanity-
 * checking the integration end-to-end without triggering a full
 * pricing crawl. Production callers should never hit this — feature
 * services (PricingCrawlaProcessor → ProductExtractorService) use
 * `LlmExtractorService` directly.
 */
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('llm')
export class LlmController {
  constructor(private readonly llm: LlmExtractorService) {}

  @Get('health')
  health() {
    return {
      enabled: this.llm.isEnabled(),
      ...(this.llm.isEnabled() ? {} : { hint: 'set LLM_SERVICE_URL in api .env' }),
    };
  }

  @Get('ready')
  async ready() {
    return this.llm.health();
  }

  @Post('extract')
  async extract(@Body() dto: ExtractDto) {
    const result = await this.llm.extract(dto);
    if (!result) {
      return {
        ok: false,
        reason: this.llm.isEnabled()
          ? 'LLM service returned no result (check service logs)'
          : 'LLM service not configured — set LLM_SERVICE_URL',
      };
    }
    return { ok: true, ...result };
  }

  /**
   * Hand a product query to the LLM service. It does the DDG search,
   * per-URL crawl, ranking and returns top results. Long call — minutes
   * not seconds — because each candidate URL is crawled.
   */
  @Post('search-products')
  async searchProducts(@Body() dto: SearchProductsDto) {
    const result = await this.llm.searchProducts(dto);
    if (!result) {
      return {
        ok: false,
        reason: this.llm.isEnabled()
          ? 'LLM service returned no result (check service logs)'
          : 'LLM service not configured — set LLM_SERVICE_URL',
      };
    }
    return { ok: true, ...result };
  }
}
