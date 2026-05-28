import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TrackedCompanyStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FeatureAccessService } from '../billing/feature-access.service';
import { ActivityService } from '../activity/activity.service';
import { JobSearchQueue } from '../../queues/job-search/job-search.queue';
import { CreateJobSearchDto } from './dto/create-job-search.dto';
import {
  CreateTrackedCompanyDto,
  UpdateTrackedCompanyDto,
} from './dto/tracked-company.dto';
import { HOT_TITLES_FALLBACK, JOB_COUNTRIES } from './job-search.meta';

@Injectable()
export class JobSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeatureAccessService,
    private readonly activity: ActivityService,
    private readonly queue: JobSearchQueue,
  ) {}

  // ---------- User-facing ---------------------------------------------

  /**
   * Reference data for the Search screen — hot titles, supported
   * countries, headline stats. Hot titles derive from recent JobSearch
   * rows so the list adapts to what users actually search.
   */
  async getMeta() {
    const since = new Date(Date.now() - 90 * 86400_000);
    const grouped = await this.prisma.jobSearch.groupBy({
      by: ['role'],
      _count: { role: true },
      where: { createdAt: { gte: since } },
      orderBy: { _count: { role: 'desc' } },
      take: 6,
    });
    const hotTitles =
      grouped.length >= 3
        ? grouped.map((g) => g.role)
        : [...HOT_TITLES_FALLBACK];

    const [activeCount, activeAgg, liveAgg] = await Promise.all([
      this.prisma.trackedCompany.count({ where: { status: TrackedCompanyStatus.ACTIVE } }),
      this.prisma.trackedCompany.aggregate({
        where: { status: TrackedCompanyStatus.ACTIVE },
        _avg: { crawlIntervalMin: true },
      }),
      this.prisma.trackedCompany.aggregate({
        where: { status: TrackedCompanyStatus.ACTIVE },
        _sum: { jobCount: true },
      }),
    ]);

    return {
      hotTitles,
      countries: JOB_COUNTRIES,
      stats: {
        trackedCompanies: activeCount,
        averageCrawlCadenceMin: Math.round(activeAgg._avg.crawlIntervalMin ?? 15),
        liveRoles: liveAgg._sum.jobCount ?? 0,
      },
    };
  }

  async createSearch(userId: string, dto: CreateJobSearchDto) {
    // Gate + consume in one call — reads `plan.limits.jobSearch` +
    // `plan.limits.jobSearchesPerMonth` from the live DB.
    await this.features.consume(userId, 'job_search');

    const row = await this.prisma.jobSearch.create({
      data: {
        userId,
        role: dto.role,
        country: dto.country ?? null,
        remote: dto.remote ?? false,
      },
    });
    await this.queue.runSearch(row.id);
    this.activity.log({
      userId,
      type: 'job_search.created',
      targetId: row.id,
      metadata: { role: row.role, country: row.country, remote: row.remote },
    });
    return this.shape(row);
  }

  async listForUser(userId: string, opts: { limit?: number } = {}) {
    const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
    const rows = await this.prisma.jobSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { _count: { select: { results: true } } },
    });
    return rows.map((r) => ({ ...this.shape(r), resultCount: r._count.results }));
  }

  /**
   * Hard-delete a job search. Cascade clears child JobResult rows via
   * the FK; TrackedCompany.lastCrawled / jobCount are NOT reset because
   * those reflect the company crawl, not this user's search.
   */
  async deleteSearch(userId: string, id: string): Promise<{ ok: true }> {
    const row = await this.requireOwned(userId, id);
    await this.prisma.jobSearch.delete({ where: { id: row.id } });
    this.activity.log({
      userId,
      type: 'job_search.created',
      targetId: row.id,
      metadata: { action: 'deleted', role: row.role },
    });
    return { ok: true };
  }

  async getResults(userId: string, id: string) {
    const search = await this.requireOwned(userId, id);
    const results = await this.prisma.jobResult.findMany({
      where: { searchId: id },
      orderBy: { relevanceScore: 'desc' },
    });
    return {
      search: this.shape(search),
      results: results.map((r) => ({
        id: r.id,
        companyId: r.companyId,
        companyName: r.companyName,
        title: r.title,
        location: r.location,
        remote: r.remote,
        salaryMin: r.salaryMin,
        salaryMax: r.salaryMax,
        currency: r.currency,
        salaryPeriod: r.salaryPeriod,
        url: r.url,
        description: r.description,
        relevanceScore: r.relevanceScore,
        tags: r.tags,
        postedAt: r.postedAt?.getTime() ?? null,
      })),
    };
  }

  // ---------- Admin tracked-companies ---------------------------------

  async listCompanies(opts: { q?: string; status?: TrackedCompanyStatus } = {}) {
    const where: Prisma.TrackedCompanyWhereInput = {};
    if (opts.status) where.status = opts.status;
    if (opts.q) {
      where.OR = [
        { name: { contains: opts.q, mode: 'insensitive' } },
        { careerUrl: { contains: opts.q, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.trackedCompany.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return rows.map(this.shapeCompany);
  }

  async createCompany(dto: CreateTrackedCompanyDto) {
    const careerUrl = normalizeCareerUrl(dto.careerUrl);
    const existing = await this.prisma.trackedCompany.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        message: `A tracked company named "${dto.name}" already exists.`,
        code: 'TRACKED_COMPANY_EXISTS',
      });
    }
    const row = await this.prisma.trackedCompany.create({
      data: {
        name: dto.name,
        careerUrl,
        selector: dto.selector ?? null,
        crawlIntervalMin: dto.crawlIntervalMin ?? 15,
        status: dto.status ?? TrackedCompanyStatus.ACTIVE,
      },
    });
    return this.shapeCompany(row);
  }

  async updateCompany(id: string, dto: UpdateTrackedCompanyDto) {
    const data: Prisma.TrackedCompanyUpdateInput = {};
    if (typeof dto.name === 'string') data.name = dto.name;
    if (typeof dto.careerUrl === 'string') data.careerUrl = normalizeCareerUrl(dto.careerUrl);
    if (typeof dto.selector === 'string') data.selector = dto.selector;
    if (typeof dto.crawlIntervalMin === 'number') data.crawlIntervalMin = dto.crawlIntervalMin;
    if (dto.status) data.status = dto.status;
    if (typeof dto.active === 'boolean') {
      data.status = dto.active ? TrackedCompanyStatus.ACTIVE : TrackedCompanyStatus.PAUSED;
    }
    const row = await this.prisma.trackedCompany.update({ where: { id }, data });
    return this.shapeCompany(row);
  }

  async deleteCompany(id: string) {
    await this.prisma.trackedCompany.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Internals -----------------------------------------------

  private async requireOwned(userId: string, id: string) {
    const row = await this.prisma.jobSearch.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('not found');
    return row;
  }

  private shape(row: {
    id: string;
    role: string;
    country: string | null;
    remote: boolean;
    status: string;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
  }) {
    return {
      id: row.id,
      role: row.role,
      country: row.country,
      remote: row.remote,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.createdAt.getTime(),
      startedAt: row.startedAt?.getTime() ?? null,
      finishedAt: row.finishedAt?.getTime() ?? null,
    };
  }

  private shapeCompany = (c: {
    id: string;
    name: string;
    careerUrl: string;
    selector: string | null;
    crawlIntervalMin: number;
    status: TrackedCompanyStatus;
    lastCrawled: Date | null;
    lastError: string | null;
    jobCount: number;
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    id: c.id,
    name: c.name,
    careerUrl: c.careerUrl,
    selector: c.selector,
    crawlIntervalMin: c.crawlIntervalMin,
    status: c.status,
    lastCrawled: c.lastCrawled?.getTime() ?? null,
    lastError: c.lastError,
    jobCount: c.jobCount,
    createdAt: c.createdAt.getTime(),
    updatedAt: c.updatedAt.getTime(),
  });
}

function normalizeCareerUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Accept "stripe.com/jobs" — strip leading slashes and store as-is.
  return trimmed.replace(/^\/+/, '');
}
