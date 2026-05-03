import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ElasticsearchService } from '../../integrations/elasticsearch/es.service';
import { SEARCH_INDEX_QUEUE } from '../queue-names';

type ESDoc = {
  id: string;
  title: string;
  snippet: string | null;
  url: string;
  source: string;
  location: string | null;
  searchId: string;
  search_text: string;
  createdAt: string;
  publishedAt: string | null;
};

@Processor(SEARCH_INDEX_QUEUE, { concurrency: 2 })
export class SearchIndexProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchIndexProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly es: ElasticsearchService,
  ) {
    super();
  }

  async process(job: Job) {
    if (!this.es.enabled) {
      // ES disabled — nothing to do; Postgres FTS handles search via tsvector.
      return { skipped: true, reason: 'es-disabled' };
    }

    if (job.name === 'index-result') {
      const { resultId } = job.data as { resultId: string };
      const r = await this.prisma.result.findUnique({ where: { id: resultId } });
      if (!r) return { skipped: true };
      await this.es.indexDocument(this.toEsDoc(r));
      return { indexed: 1 };
    }

    if (job.name === 'bulk-index-results') {
      const { ids } = job.data as { ids: string[] };
      if (ids.length === 0) return { indexed: 0 };
      const rows = await this.prisma.result.findMany({ where: { id: { in: ids } } });
      const docs = rows.map((r) => this.toEsDoc(r));
      const out = await this.es.bulkIndex(docs);
      const errored = (out as unknown as { errors?: boolean })?.errors;
      if (errored) {
        this.logger.warn(`bulk index had errors for job ${job.id}`);
      }
      return { indexed: docs.length };
    }

    this.logger.warn(`unknown job name: ${job.name}`);
    return {};
  }

  private toEsDoc(r: {
    id: string;
    title: string;
    snippet: string | null;
    url: string;
    source: string;
    location: string | null;
    searchId: string;
    fetchedAt: Date;
    publishedAt: Date | null;
  }): ESDoc {
    return {
      id: r.id,
      title: r.title,
      snippet: r.snippet,
      url: r.url,
      source: r.source,
      location: r.location,
      searchId: r.searchId,
      search_text: `${r.title} ${r.snippet ?? ''} ${r.url}`,
      createdAt: r.fetchedAt.toISOString(),
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    };
  }
}
