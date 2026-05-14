import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CronPreset, Prisma, Role, RunStatus, Search, SearchStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ScrapeQueue } from '../../queues/scrape/scrape.queue';
import { SourceRegistry } from '../scraper/sources/source.registry';
import { DEFAULT_SOURCES } from '../scraper/sources/source.types';
import { EntitlementsService } from '../billing/entitlements.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { CreateSearchDto } from './dto/create-search.dto';
import { UpdateSearchDto } from './dto/update-search.dto';

function relTime(t: Date | null | undefined): string | null {
  if (!t) return null;
  const diff = Date.now() - t.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
function relUntil(t: Date | null | undefined): string | null {
  if (!t) return null;
  const diff = t.getTime() - Date.now();
  if (diff <= 0) return 'soon';
  const m = Math.round(diff / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h}h`;
  const d = Math.round(h / 24);
  return `in ${d}d`;
}
function cronLabel(c: CronPreset): string {
  switch (c) {
    case 'HOURLY': return 'Hourly';
    case 'DAILY': return 'Daily · 09:00';
    case 'WEEKLY': return 'Weekly · Mon 08:00';
    case 'MANUAL': return 'Manual';
  }
}

const AUTO_NAME_PREFIX = 'crwl';
const AUTO_NAME_PAD = 3;
const AUTO_NAME_RE = /^crwl(\d+)$/i;

function timeWindowToCutoff(t: string | undefined): Date | null {
  switch (t) {
    case '24h':
      return new Date(Date.now() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export type SearchView = ReturnType<typeof shape>;

function shape(s: Search & { _count?: { results: number } }) {
  return {
    id: s.id,
    name: s.name,
    keywords: s.keywords,
    locations: s.locations,
    sources: s.sources,
    cron: s.cron,
    cronLabel: cronLabel(s.cron),
    status: s.status,
    filterPrompt: s.filterPrompt ?? '',
    strict: s.strict,
    lastRun: relTime(s.lastRunAt) ?? 'never',
    nextRun:
      s.status === SearchStatus.PAUSED
        ? 'paused'
        : s.cron === CronPreset.MANUAL
          ? 'manual'
          : (relUntil(s.nextRunAt) ?? 'manual'),
    results: s._count?.results ?? 0,
    lastError: s.lastError,
    ownerId: s.userId,
    createdAt: s.createdAt.getTime(),
  };
}

@Injectable()
export class SearchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scrapeQueue: ScrapeQueue,
    private readonly registry: SourceRegistry,
    private readonly entitlements: EntitlementsService,
    private readonly onboarding: OnboardingService,
  ) {}

  async listForUser(
    userId: string,
    opts: {
      page?: number;
      pageSize?: number;
      q?: string;
      keyword?: string;
      time?: string;
    } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const where: Prisma.SearchWhereInput = { userId, deletedAt: null };
    const q = opts.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { keywords: { has: q } },
      ];
    }
    const keyword = opts.keyword?.trim();
    if (keyword) {
      where.keywords = { has: keyword };
    }
    const cutoff = timeWindowToCutoff(opts.time);
    if (cutoff) {
      where.createdAt = { gte: cutoff };
    }
    const [total, rows] = await Promise.all([
      this.prisma.search.count({ where }),
      this.prisma.search.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { results: { where: { hidden: false } } } } },
      }),
    ]);
    return {
      items: rows.map(shape),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  private async getOwned(userId: string, id: string) {
    const s = await this.prisma.search.findFirst({
      where: { id, userId, deletedAt: null },
      include: { _count: { select: { results: { where: { hidden: false } } } } },
    });
    if (!s) throw new NotFoundException('not found');
    return s;
  }

  async getOne(userId: string, id: string) {
    return shape(await this.getOwned(userId, id));
  }

  async create(userId: string, role: Role, dto: CreateSearchDto) {
    // Plan-limit gates fire first.
    await this.entitlements.assertCanCreateSearch(userId);
    await this.entitlements.assertCanAddKeywords(userId, dto.keywords.length);
    await this.entitlements.assertCronAllowed(userId, dto.cron);

    // Sources are derived server-side from the user's plan + admin denylist
    // — clients no longer pick them. Snapshot the resolved set onto the
    // search row so a future plan change doesn't silently mutate what runs.
    const sources = await this.derivedSourcesForUser(userId);

    const trimmedName = dto.name?.trim() ?? '';
    const resolvedName =
      trimmedName.length > 0 ? trimmedName : await this.nextAutoName(userId);
    const created = await this.prisma.search.create({
      data: {
        userId,
        name: resolvedName,
        keywords: dto.keywords,
        locations: dto.locations ?? [],
        sources,
        cron: dto.cron,
        filterPrompt: dto.filterPrompt ?? null,
        strict: dto.strict ?? false,
        status: SearchStatus.RUNNING,
      },
    });
    await this.scrapeQueue.scheduleRepeatable(created.id, created.cron);
    // Trigger the post-create walkthrough on the first crawl. Idempotent
    // and admin-skipping; safe to call after every create.
    await this.onboarding.ensureFirstCrawl(userId, role);
    return shape({ ...created, _count: { results: 0 } });
  }

  /**
   * Resolve the sources a user is currently entitled to:
   *   plan.allowedSourceCategories ∩ available registry ∖ user.disabledSourceCategories
   *
   * Falls back to DEFAULT_SOURCES (Google News only) if the plan can't be
   * loaded — the user always gets a working search even if billing is in a
   * weird state.
   */
  private async derivedSourcesForUser(userId: string): Promise<string[]> {
    try {
      const ent = await this.entitlements.ensureFor(userId);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { disabledSourceCategories: true },
      });
      const ids = this.registry.idsForUser({
        allowedCategories: ent.limits.allowedSourceCategories ?? [],
        deniedCategories: user?.disabledSourceCategories ?? [],
      });
      return ids.length > 0 ? ids : [...DEFAULT_SOURCES];
    } catch {
      return [...DEFAULT_SOURCES];
    }
  }

  /**
   * Compute the next sequential auto-name for a user — "crwl001", "crwl002",
   * etc. Strategy: pull every search whose name starts with the prefix
   * (including soft-deleted ones, so a deleted/restored slot isn't recycled),
   * keep the ones that strictly match `crwl<digits>`, take max + 1, and
   * left-pad to {@link AUTO_NAME_PAD} digits. Padding floor is 3 — counts
   * past 999 emit "crwl1000" without truncation.
   *
   * Concurrent creates can race to the same number; the dashboard tolerates
   * duplicates and the chance is small in practice.
   */
  async nextAutoName(userId: string): Promise<string> {
    const rows = await this.prisma.search.findMany({
      where: { userId, name: { startsWith: AUTO_NAME_PREFIX, mode: 'insensitive' } },
      select: { name: true },
    });
    let max = 0;
    for (const { name } of rows) {
      const m = AUTO_NAME_RE.exec(name);
      if (!m) continue;
      const n = Number.parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    const next = max + 1;
    return `${AUTO_NAME_PREFIX}${String(next).padStart(AUTO_NAME_PAD, '0')}`;
  }

  async update(userId: string, id: string, dto: UpdateSearchDto) {
    await this.getOwned(userId, id);
    if (Array.isArray(dto.keywords)) {
      await this.entitlements.assertCanAddKeywords(userId, dto.keywords.length);
    }
    if (dto.cron) {
      await this.entitlements.assertCronAllowed(userId, dto.cron);
    }
    const data: Prisma.SearchUpdateInput = {};
    if (typeof dto.name === 'string') data.name = dto.name.trim();
    if (Array.isArray(dto.keywords)) data.keywords = dto.keywords;
    if (Array.isArray(dto.locations)) data.locations = dto.locations;
    if (typeof dto.filterPrompt === 'string') data.filterPrompt = dto.filterPrompt;
    if (typeof dto.strict === 'boolean') data.strict = dto.strict;
    if (dto.cron) data.cron = dto.cron;
    if (dto.status) data.status = dto.status;
    if (Object.keys(data).length) {
      await this.prisma.search.update({ where: { id }, data });
    }
    const updated = await this.getOwned(userId, id);
    if (dto.cron || dto.status) {
      if (updated.status === SearchStatus.PAUSED) {
        await this.scrapeQueue.unschedule(updated.id);
      } else {
        await this.scrapeQueue.scheduleRepeatable(updated.id, updated.cron);
      }
    }
    return shape(updated);
  }

  async remove(userId: string, id: string) {
    const existing = await this.getOwned(userId, id);
    await this.scrapeQueue.unschedule(existing.id);
    // Soft delete: keep the row + history (runs, results, alerts) so a
    // future "trash bin" / restore flow can recover it. List/get queries
    // filter on `deletedAt: null` so the user no longer sees it.
    await this.prisma.search.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  async runNow(userId: string, id: string) {
    const existing = await this.getOwned(userId, id);
    // Bail before charging the user's manual-run quota if a previous run is
    // still in flight — otherwise a re-queue would burn a quota unit and
    // race with the live processor.
    const inflight = await this.prisma.run.findFirst({
      where: { searchId: existing.id, status: RunStatus.RUNNING },
      select: { id: true },
    });
    if (inflight) {
      throw new ConflictException({
        message: 'A run is already in progress for this search.',
        code: 'RUN_IN_PROGRESS',
      });
    }
    // Consume one manual-run from the user's monthly quota (or a paid run
    // pack). Throws ForbiddenException with PLAN_LIMIT_EXCEEDED on quota.
    await this.entitlements.consumeManualRun(userId);
    return this.scrapeQueue.runNow(existing.id);
  }
}
