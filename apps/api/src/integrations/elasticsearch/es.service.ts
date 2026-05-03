import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

/**
 * Optional Elasticsearch wrapper. When ELASTICSEARCH_URL is unset, every
 * method becomes a no-op and `enabled` stays false — callers should fall
 * back to Postgres FTS.
 */
@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client | null = null;
  enabled = false;
  index: string;

  constructor(private readonly config: ConfigService) {
    this.index = config.get<string>('ELASTICSEARCH_INDEX') ?? 'crwla_results';
  }

  async onModuleInit() {
    const url = this.config.get<string>('ELASTICSEARCH_URL');
    if (!url) {
      this.logger.warn('ELASTICSEARCH_URL not set — ES disabled, using Postgres FTS only');
      return;
    }
    this.client = new Client({ node: url });
    try {
      await this.client.ping();
      this.enabled = true;
      this.logger.log(`Connected to Elasticsearch at ${url}`);
      await this.ensureIndex();
    } catch (e) {
      this.logger.warn(`Elasticsearch unreachable (${(e as Error).message}) — disabled`);
      this.client = null;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  getClient(): Client | null {
    return this.client;
  }

  /** Create the index + canonical mapping if it doesn't exist. */
  async ensureIndex(): Promise<void> {
    if (!this.client) return;
    const exists = await this.client.indices.exists({ index: this.index });
    if (exists) return;
    await this.client.indices.create({
      index: this.index,
      mappings: {
        properties: {
          title: { type: 'text' },
          snippet: { type: 'text' },
          search_text: { type: 'text', analyzer: 'english' },
          source: { type: 'keyword' },
          location: { type: 'keyword' },
          searchId: { type: 'keyword' },
          url: { type: 'keyword' },
          createdAt: { type: 'date' },
          publishedAt: { type: 'date' },
        },
      },
    });
    this.logger.log(`Created Elasticsearch index: ${this.index}`);
  }

  async indexDocument(doc: Record<string, unknown> & { id: string }) {
    if (!this.client) return;
    return this.client.index({
      index: this.index,
      id: doc.id,
      document: doc,
      refresh: 'wait_for',
    });
  }

  async bulkIndex(docs: Array<Record<string, unknown> & { id: string }>) {
    if (!this.client || docs.length === 0) return;
    const operations = docs.flatMap((doc) => [
      { index: { _index: this.index, _id: doc.id } },
      doc,
    ]);
    return this.client.bulk({ operations, refresh: false });
  }

  async search(query: Record<string, unknown>) {
    if (!this.client) return null;
    return this.client.search({ index: this.index, ...query });
  }
}
