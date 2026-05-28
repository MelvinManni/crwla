import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PricingSearchStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AdapterRegistry } from '../../modules/pricing-crawla/adapters/adapter.registry';
import { PricingIntentService } from '../../modules/pricing-crawla/ai/intent.service';
import { CurrencyService } from '../../modules/pricing-crawla/currency.service';
import { RankingService } from '../../modules/pricing-crawla/ranking.service';
import type { RawListing } from '../../modules/pricing-crawla/adapters/source-adapter';
import { PRICING_CRAWLA_QUEUE } from '../queue-names';

const MAX_RESULTS = 20;

@Processor(PRICING_CRAWLA_QUEUE, { concurrency: 4 })
export class PricingCrawlaProcessor extends WorkerHost {
  private readonly logger = new Logger(PricingCrawlaProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AdapterRegistry,
    private readonly intent: PricingIntentService,
    private readonly currency: CurrencyService,
    private readonly ranking: RankingService,
  ) {
    super();
  }

  async process(job: Job<{ searchId: string }>) {
    const { searchId } = job.data;
    const search = await this.prisma.pricingSearch.findUnique({ where: { id: searchId } });
    if (!search) throw new Error(`pricing search ${searchId} not found`);
    if (search.status === PricingSearchStatus.COMPLETED) return { skipped: true };

    const startedAt = new Date();
    await this.prisma.pricingSearch.update({
      where: { id: searchId },
      data: { status: PricingSearchStatus.RUNNING, startedAt },
    });

    try {
      const ctx = {
        intent: search.intent,
        productName: search.productName,
        country: search.country,
        category: search.category,
        maxPriceUsd: search.maxPriceUsd,
      };

      // 1. Fan out across adapters in parallel. Errors per-adapter don't
      //    kill the run — collect them onto `errors[]`.
      const adapters = this.registry.forListings();
      const errors: Array<{ source: string; error: string }> = [];
      const collected: Array<RawListing & { adapterTrust: number }> = [];
      await Promise.all(
        adapters.map(async (a) => {
          try {
            const got = await a.fetch(ctx);
            for (const r of got) collected.push({ ...r, adapterTrust: a.baselineTrust });
          } catch (e) {
            errors.push({ source: a.id, error: String((e as Error).message ?? e) });
          }
        }),
      );

      // 2. Video adapters separately — used to enrich winning listings.
      const videoAdapters = this.registry.forVideos();
      const videoListings: RawListing[] = [];
      for (const v of videoAdapters) {
        try {
          videoListings.push(...(await v.fetch(ctx)));
        } catch (e) {
          errors.push({ source: v.id, error: String((e as Error).message ?? e) });
        }
      }
      const videoUrl = videoListings[0]?.youtubeUrl ?? videoListings[0]?.url ?? null;

      // 3. Normalize prices → USD, validate against intent, dedupe by
      //    (source + title) so adapters that return near-identical
      //    listings collapse.
      const normalized = collected.map((l) => {
        const priceUsd = this.currency.toUsd(l.priceNative, l.currencyNative);
        const intent = this.intent.validate(
          search.intent,
          { title: l.title, storeName: l.storeName, priceUsd, url: l.url },
          search.productName,
        );
        const trustScore = this.ranking.trustFor(l.adapterTrust, l.trustHint);
        return { ...l, priceUsd, trustScore, intent };
      });

      const deduped = new Map<string, (typeof normalized)[number]>();
      for (const n of normalized) {
        const key = `${n.source}::${n.title.toLowerCase().slice(0, 80)}`;
        const prev = deduped.get(key);
        if (!prev || n.priceUsd < prev.priceUsd) deduped.set(key, n);
      }

      // 4. Rank.
      const ranked = this.ranking.score(Array.from(deduped.values()));

      // 5. BACKFILL FILTER — drop hard mismatches before slicing. The
      //    intent validator catches version/qualifier drift (e.g. user
      //    searched "iPhone 17", adapter returned iPhone 15 listings):
      //    those would otherwise leak through with a small 5% rank
      //    penalty. Hard-filtering keeps the surface aligned with the
      //    user's query even when adapters return noisy data.
      const droppedRows = ranked.filter((r) => r.intent.verdict === 'mismatch');
      const cleanRanked = ranked.filter((r) => r.intent.verdict !== 'mismatch');
      const top = cleanRanked.slice(0, MAX_RESULTS);

      // 6. Alternatives: exactly 3, picked from the long tail of CLEAN
      //    rows so we don't suggest mismatched alternatives either.
      const keptSet = new Set(top);
      const alts = this.ranking
        .alternatives(cleanRanked, keptSet)
        .map((a) => ({
          title: a.title,
          priceUsd: Number(a.priceUsd.toFixed(2)),
          url: a.url,
          imageUrl: a.imageUrl ?? null,
          storeName: a.storeName,
          save:
            top[0] && top[0].priceUsd > a.priceUsd
              ? `$${Math.round(top[0].priceUsd - a.priceUsd)} cheaper`
              : 'alternative',
        }));

      // 7. Apply max-price filter if set, but only as a post-filter so
      //    we still record the rejected universe in metadata.
      const finalRows =
        search.maxPriceUsd && search.maxPriceUsd > 0
          ? top.filter((r) => r.priceUsd <= search.maxPriceUsd!)
          : top;

      // 7. Persist results + reviews.
      await this.prisma.$transaction(async (tx) => {
        await tx.pricingResult.deleteMany({ where: { searchId } });
        for (const r of finalRows) {
          const created = await tx.pricingResult.create({
            data: {
              searchId,
              storeName: r.storeName,
              source: r.source,
              title: r.title,
              priceUsd: Number(r.priceUsd.toFixed(2)),
              priceNative: r.priceNative,
              currencyNative: r.currencyNative,
              url: r.url,
              imageUrl: r.imageUrl ?? null,
              youtubeUrl: r.youtubeUrl ?? videoUrl,
              reviewSummary: this.intent.whyMatchBlurb({
                title: r.title,
                storeName: r.storeName,
                rating: r.rating ?? null,
                reviewCount: r.reviewCount ?? 0,
                priceUsd: r.priceUsd,
                cheapestUsd: finalRows[0]?.priceUsd ?? r.priceUsd,
              }),
              rating: r.rating ?? null,
              reviewCount: r.reviewCount ?? 0,
              trustScore: r.trustScore,
              rankScore: r.rankScore,
              intentMatch: r.intent.verdict,
              intentReason: r.intent.reason,
              percentile: r.percentile,
              dealBadge: r.dealBadge ?? null,
              metadata: { adapterTrust: r.trustScore },
            },
          });
          if (r.reviews?.length) {
            await tx.pricingReview.createMany({
              data: r.reviews.slice(0, 6).map((rv) => ({
                resultId: created.id,
                author: rv.author,
                rating: rv.rating,
                body: rv.body,
                postedAt: rv.postedAt ?? null,
              })),
            });
          }
        }
      });

      const finishedAt = new Date();
      await this.prisma.pricingSearch.update({
        where: { id: searchId },
        data: {
          status: PricingSearchStatus.COMPLETED,
          finishedAt,
          alternatives: alts,
          metadata: {
            adapterCount: adapters.length,
            totalCollected: collected.length,
            keptAfterRanking: finalRows.length,
            droppedForMismatch: droppedRows.length,
            // First few mismatch reasons — surfaced for admin debugging.
            sampleDropReasons: droppedRows.slice(0, 5).map((r) => ({
              storeName: r.storeName,
              title: r.title,
              reason: r.intent.reason,
            })),
            errors,
            durationMs: finishedAt.getTime() - startedAt.getTime(),
          },
        },
      });

      return {
        kept: finalRows.length,
        droppedForMismatch: droppedRows.length,
        alternatives: alts.length,
        errors,
      };
    } catch (err) {
      await this.prisma.pricingSearch.update({
        where: { id: searchId },
        data: {
          status: PricingSearchStatus.ERROR,
          error: String((err as Error).message ?? err),
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }
}
