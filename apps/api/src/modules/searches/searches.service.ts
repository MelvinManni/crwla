import { Injectable, NotFoundException } from '@nestjs/common';
import { CronPreset, Prisma, Search, SearchStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ScrapeQueue } from '../../queues/scrape/scrape.queue';
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
  ) {}

  async listForUser(userId: string) {
    const rows = await this.prisma.search.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { results: { where: { hidden: false } } } } },
    });
    return rows.map(shape);
  }

  private async getOwned(userId: string, id: string) {
    const s = await this.prisma.search.findFirst({
      where: { id, userId },
      include: { _count: { select: { results: { where: { hidden: false } } } } },
    });
    if (!s) throw new NotFoundException('not found');
    return s;
  }

  async getOne(userId: string, id: string) {
    return shape(await this.getOwned(userId, id));
  }

  async create(userId: string, dto: CreateSearchDto) {
    const created = await this.prisma.search.create({
      data: {
        userId,
        name: dto.name.trim(),
        keywords: dto.keywords,
        locations: dto.locations ?? [],
        sources: dto.sources ?? [],
        cron: dto.cron,
        filterPrompt: dto.filterPrompt ?? null,
        status: SearchStatus.RUNNING,
      },
    });
    await this.scrapeQueue.scheduleRepeatable(created.id, created.cron);
    return shape({ ...created, _count: { results: 0 } });
  }

  async update(userId: string, id: string, dto: UpdateSearchDto) {
    const existing = await this.getOwned(userId, id);
    const data: Prisma.SearchUpdateInput = {};
    if (typeof dto.name === 'string') data.name = dto.name.trim();
    if (Array.isArray(dto.keywords)) data.keywords = dto.keywords;
    if (Array.isArray(dto.locations)) data.locations = dto.locations;
    if (Array.isArray(dto.sources)) data.sources = dto.sources;
    if (typeof dto.filterPrompt === 'string') data.filterPrompt = dto.filterPrompt;
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
    await this.prisma.search.delete({ where: { id: existing.id } });
    return { ok: true };
  }

  async runNow(userId: string, id: string) {
    const existing = await this.getOwned(userId, id);
    return this.scrapeQueue.runNow(existing.id);
  }
}
