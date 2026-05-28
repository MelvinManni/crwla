import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FeatureAccessService } from '../billing/feature-access.service';
import { ActivityService } from '../activity/activity.service';
import { PricingCrawlaQueue } from '../../queues/pricing-crawla/pricing-crawla.queue';
import { PricingIntentService } from './ai/intent.service';
import { CurrencyService, SUPPORTED_CURRENCIES } from './currency.service';
import { AdapterRegistry } from './adapters/adapter.registry';
import {
  PRICING_CATEGORIES,
  PRICING_COUNTRIES,
  PRICING_TRENDING_FALLBACK,
} from './pricing-crawla.meta';
import { CreatePricingSearchDto } from './dto/create-pricing-search.dto';

export type PricingSearchView = {
  id: string;
  productName: string;
  intent: string;
  country: string | null;
  category: string | null;
  currency: string;
  maxPriceUsd: number | null;
  status: string;
  alternatives: unknown;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  metadata: Prisma.JsonValue | null;
};

@Injectable()
export class PricingCrawlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeatureAccessService,
    private readonly activity: ActivityService,
    private readonly queue: PricingCrawlaQueue,
    private readonly intent: PricingIntentService,
    private readonly currency: CurrencyService,
    private readonly adapters: AdapterRegistry,
  ) {}

  /**
   * Reference data for the Search screen — trending queries, supported
   * countries / categories / currencies, and headline stats. Trending is
   * derived from the last 90 days of PricingSearch rows; we fall back to
   * a curated list when the DB is empty so first-run UX still works.
   */
  async getMeta() {
    const since = new Date(Date.now() - 90 * 86400_000);
    const grouped = await this.prisma.pricingSearch.groupBy({
      by: ['productName'],
      _count: { productName: true },
      where: { createdAt: { gte: since } },
      orderBy: { _count: { productName: 'desc' } },
      take: 8,
    });

    const trending =
      grouped.length >= 3
        ? grouped.slice(0, 8).map((g, i) => ({
            q: g.productName,
            hot: i < 2,
            count: g._count.productName,
          }))
        : PRICING_TRENDING_FALLBACK.map((t) => ({ ...t, count: 0 }));

    // Headline stats — real values where we can compute them, sensible
    // approximations otherwise so the cards always render.
    const [reviewsAgg, resultCount] = await Promise.all([
      this.prisma.pricingResult.aggregate({
        _sum: { reviewCount: true },
      }),
      this.prisma.pricingResult.count(),
    ]);

    return {
      trending,
      countries: PRICING_COUNTRIES,
      categories: PRICING_CATEGORIES,
      currencies: SUPPORTED_CURRENCIES,
      stats: {
        retailers: this.adapters.forListings().length,
        reviewsIndexed: reviewsAgg._sum.reviewCount ?? 0,
        resultsTracked: resultCount,
      },
    };
  }

  async createSearch(userId: string, dto: CreatePricingSearchDto): Promise<PricingSearchView> {
    // Plan-gate + bump the monthly quota in one call. Reads the live
    // `plan.limits` JSON from the DB — no hardcoded tier logic.
    await this.features.consume(userId, 'pricing_crawla');

    const intent = await this.intent.generateIntent({
      productName: dto.productName,
      country: dto.country,
      category: dto.category,
      maxPriceUsd: dto.maxPriceUsd,
    });

    const row = await this.prisma.pricingSearch.create({
      data: {
        userId,
        productName: dto.productName,
        intent,
        country: dto.country ?? null,
        category: dto.category ?? null,
        currency: dto.currency ?? 'USD',
        maxPriceUsd: dto.maxPriceUsd ?? null,
      },
    });

    await this.queue.runSearch(row.id);
    this.activity.log({
      userId,
      type: 'pricing_crawla.search_created',
      targetId: row.id,
      metadata: { productName: row.productName, country: row.country },
    });

    return this.shape(row);
  }

  async getResults(userId: string, searchId: string) {
    const search = await this.requireOwned(userId, searchId);
    const results = await this.prisma.pricingResult.findMany({
      where: { searchId },
      orderBy: { rankScore: 'desc' },
    });
    return {
      search: this.shape(search),
      results: results.map((r) => ({
        id: r.id,
        storeName: r.storeName,
        source: r.source,
        title: r.title,
        priceUsd: r.priceUsd,
        priceNative: r.priceNative,
        currencyNative: r.currencyNative,
        url: r.url,
        imageUrl: r.imageUrl,
        youtubeUrl: r.youtubeUrl,
        reviewSummary: r.reviewSummary,
        rating: r.rating,
        reviewCount: r.reviewCount,
        trustScore: r.trustScore,
        rankScore: r.rankScore,
        percentile: r.percentile,
        dealBadge: r.dealBadge,
        intentMatch: r.intentMatch,
      })),
    };
  }

  async getResultDetail(userId: string, resultId: string) {
    const result = await this.prisma.pricingResult.findUnique({
      where: { id: resultId },
      include: { search: true, reviews: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!result || result.search.userId !== userId) {
      throw new NotFoundException('not found');
    }
    return {
      result: {
        id: result.id,
        storeName: result.storeName,
        source: result.source,
        title: result.title,
        priceUsd: result.priceUsd,
        priceNative: result.priceNative,
        currencyNative: result.currencyNative,
        url: result.url,
        imageUrl: result.imageUrl,
        youtubeUrl: result.youtubeUrl,
        reviewSummary: result.reviewSummary,
        rating: result.rating,
        reviewCount: result.reviewCount,
        trustScore: result.trustScore,
        percentile: result.percentile,
        dealBadge: result.dealBadge,
        intentMatch: result.intentMatch,
        intentReason: result.intentReason,
      },
      reviews: result.reviews.map((rv) => ({
        id: rv.id,
        author: rv.author,
        rating: rv.rating,
        body: rv.body,
        postedAt: rv.postedAt?.getTime() ?? null,
      })),
      search: this.shape(result.search),
    };
  }

  convert(amountUsd: number, target: string) {
    const value = this.currency.fromUsd(amountUsd, target);
    return { amountUsd, target, value, table: this.currency.table() };
  }

  rates() {
    return { rates: this.currency.table() };
  }

  /**
   * Hard-delete a pricing search. Prisma cascades through PricingResult
   * → PricingReview via the `onDelete: Cascade` FK chain so a single
   * row delete cleans up everything. We log to the activity feed for
   * audit/visibility.
   */
  async deleteSearch(userId: string, id: string): Promise<{ ok: true }> {
    const row = await this.requireOwned(userId, id);
    await this.prisma.pricingSearch.delete({ where: { id: row.id } });
    this.activity.log({
      userId,
      type: 'pricing_crawla.search_created',
      targetId: row.id,
      metadata: { action: 'deleted', productName: row.productName },
    });
    return { ok: true };
  }

  async listForUser(userId: string, opts: { limit?: number } = {}) {
    const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
    const rows = await this.prisma.pricingSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { _count: { select: { results: true } } },
    });
    return rows.map((r) => ({ ...this.shape(r), resultCount: r._count.results }));
  }

  private async requireOwned(userId: string, id: string) {
    const row = await this.prisma.pricingSearch.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException('not found');
    return row;
  }

  private shape(row: {
    id: string;
    productName: string;
    intent: string;
    country: string | null;
    category: string | null;
    currency: string;
    maxPriceUsd: number | null;
    status: string;
    alternatives: Prisma.JsonValue;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    metadata: Prisma.JsonValue;
  }): PricingSearchView {
    return {
      id: row.id,
      productName: row.productName,
      intent: row.intent,
      country: row.country,
      category: row.category,
      currency: row.currency,
      maxPriceUsd: row.maxPriceUsd,
      status: row.status,
      alternatives: row.alternatives ?? [],
      createdAt: row.createdAt.getTime(),
      startedAt: row.startedAt?.getTime() ?? null,
      finishedAt: row.finishedAt?.getTime() ?? null,
      metadata: row.metadata,
    };
  }
}
