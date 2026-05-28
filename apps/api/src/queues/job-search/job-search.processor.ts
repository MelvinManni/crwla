import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobSearchStatus, TrackedCompanyStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FixtureCareerAdapter } from '../../modules/job-search/adapters/fixture-career.adapter';
import { AiRelevanceService } from '../../modules/job-search/ai/ai-relevance.service';
import { JOB_SEARCH_QUEUE } from '../queue-names';

@Processor(JOB_SEARCH_QUEUE, { concurrency: 4 })
export class JobSearchProcessor extends WorkerHost {
  private readonly logger = new Logger(JobSearchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fixture: FixtureCareerAdapter,
    private readonly relevance: AiRelevanceService,
  ) {
    super();
  }

  async process(job: Job<{ searchId: string }>) {
    const { searchId } = job.data;
    const search = await this.prisma.jobSearch.findUnique({ where: { id: searchId } });
    if (!search) throw new Error(`job search ${searchId} not found`);

    await this.prisma.jobSearch.update({
      where: { id: searchId },
      data: { status: JobSearchStatus.RUNNING, startedAt: new Date() },
    });

    try {
      // Pull only ACTIVE companies — paused/error ones stay in admin
      // but are excluded from this run.
      const companies = await this.prisma.trackedCompany.findMany({
        where: { status: TrackedCompanyStatus.ACTIVE },
      });

      const ctx = {
        role: search.role,
        country: search.country,
        remoteOnly: search.remote,
      };

      // Fan out per company in parallel — bound concurrency so a slow
      // company adapter can't starve the others.
      const results = await Promise.all(
        companies.map(async (c) => {
          try {
            const raw = await this.fixture.fetch(c, ctx);
            return raw.map((j) => ({ company: c, job: j }));
          } catch (e) {
            await this.prisma.trackedCompany.update({
              where: { id: c.id },
              data: {
                status: TrackedCompanyStatus.ERROR,
                lastError: String((e as Error).message ?? e),
              },
            });
            return [];
          }
        }),
      );

      const flat = results.flat();

      // Score relevance; drop weak matches (below the configured cutoff).
      const scored = flat
        .map(({ company, job: j }) => {
          const verdict = this.relevance.score({
            role: search.role,
            jobTitle: j.title,
            jobDescription: j.description,
            tags: j.tags,
          });
          return { company, job: j, verdict };
        })
        .filter((r) => r.verdict.score >= AiRelevanceService.DROP_BELOW);

      // Persist atomically per search so a re-run replaces, not stacks.
      await this.prisma.$transaction(async (tx) => {
        await tx.jobResult.deleteMany({ where: { searchId } });
        if (scored.length === 0) return;
        await tx.jobResult.createMany({
          data: scored.map(({ company, job: j, verdict }) => ({
            searchId,
            companyId: company.id,
            companyName: company.name,
            title: j.title,
            location: j.location,
            remote: j.remote,
            salaryMin: j.salaryMin,
            salaryMax: j.salaryMax,
            currency: j.currency,
            salaryPeriod: j.salaryPeriod,
            url: j.url,
            description: j.description,
            relevanceScore: verdict.score,
            tags: j.tags,
            postedAt: j.postedAt,
          })),
        });
        // Refresh per-company job counts + lastCrawled for the admin table.
        const now = new Date();
        const groups = new Map<string, number>();
        for (const r of scored) groups.set(r.company.id, (groups.get(r.company.id) ?? 0) + 1);
        for (const [companyId, count] of groups) {
          await tx.trackedCompany.update({
            where: { id: companyId },
            data: { jobCount: count, lastCrawled: now, lastError: null },
          });
        }
      });

      await this.prisma.jobSearch.update({
        where: { id: searchId },
        data: {
          status: JobSearchStatus.COMPLETED,
          finishedAt: new Date(),
          metadata: { companiesCrawled: companies.length, kept: scored.length },
        },
      });

      return { kept: scored.length, companies: companies.length };
    } catch (err) {
      await this.prisma.jobSearch.update({
        where: { id: searchId },
        data: {
          status: JobSearchStatus.ERROR,
          error: String((err as Error).message ?? err),
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }
}
