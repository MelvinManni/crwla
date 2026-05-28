import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { PricingCrawlaService } from './pricing-crawla.service';
import { CreatePricingSearchDto } from './dto/create-pricing-search.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';

@UseGuards(JwtAuthGuard)
@Controller('pricing-crawla')
export class PricingCrawlaController {
  constructor(private readonly service: PricingCrawlaService) {}

  @Post('search')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePricingSearchDto,
  ) {
    const search = await this.service.createSearch(user.id, dto);
    return { search };
  }

  @Get('searches')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limitRaw?: string,
  ) {
    const items = await this.service.listForUser(user.id, {
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
    return { items };
  }

  @Get('rates')
  rates() {
    return this.service.rates();
  }

  /**
   * Reference data: trending queries, countries, categories, currencies,
   * stats. Drives the Search-screen UI without hardcoded constants.
   */
  @Get('meta')
  meta() {
    return this.service.getMeta();
  }

  @Post('convert-currency')
  convert(@Body() dto: ConvertCurrencyDto) {
    return this.service.convert(dto.amountUsd, dto.target);
  }

  // Routed after fixed paths so Nest doesn't capture "searches" / "rates"
  // / "convert-currency" / "result" as a :searchId.
  @Get(':searchId/results')
  results(
    @CurrentUser() user: AuthenticatedUser,
    @Param('searchId') searchId: string,
  ) {
    return this.service.getResults(user.id, searchId);
  }

  @Get('result/:id/details')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getResultDetail(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deleteSearch(user.id, id);
  }
}
