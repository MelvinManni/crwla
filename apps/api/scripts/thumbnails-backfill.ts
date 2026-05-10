/* eslint-disable no-console */
// One-shot backfill for `Result.imageUrl`. Walks every Result that doesn't
// have an image, fetches a thumbnail (og:image / twitter:image / first <img>
// / favicon), and writes it back. Concurrency-bounded.
//
// Usage:  cd apps/api && npx ts-node -r tsconfig-paths/register scripts/thumbnails-backfill.ts
//   --batch 200    rows per loop (default 200)
//   --concurrency  parallel HTTP fetches (default 6)
//   --limit        cap total rows processed this run

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { ThumbnailService } from '../src/modules/scraper/thumbnail.service';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const batch = arg('batch', 200);
  const concurrency = arg('concurrency', 6);
  const limit = arg('limit', Number.POSITIVE_INFINITY);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const thumbs = app.get(ThumbnailService);

  let processed = 0;
  let updated = 0;

  // Loop until we run out, or hit the user-supplied --limit.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await prisma.result.findMany({
      where: { imageUrl: null, hidden: false },
      orderBy: { fetchedAt: 'desc' },
      take: Math.min(batch, limit - processed),
      select: { id: true, url: true, imageUrl: true },
    });
    if (rows.length === 0) break;

    const enriched = await thumbs.enrich(rows, concurrency);
    const writes = enriched
      .filter((r) => r.imageUrl)
      .map((r) =>
        prisma.result.update({
          where: { id: r.id },
          data: { imageUrl: r.imageUrl },
        }),
      );
    await prisma.$transaction(writes);

    processed += rows.length;
    updated += writes.length;
    console.log(`[backfill] ${processed} processed · ${updated} updated`);
    if (processed >= limit) break;
  }

  console.log(`[backfill] done — ${updated}/${processed} thumbnails written`);
  await app.close();
}

main().catch((err) => {
  console.error('[thumbnails-backfill] failed:', err);
  process.exit(1);
});
