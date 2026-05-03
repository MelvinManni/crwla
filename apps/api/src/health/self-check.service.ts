import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/prisma/prisma.service';
import { ElasticsearchService } from '../integrations/elasticsearch/es.service';
import IORedis from 'ioredis';

export type SelfCheckReport = {
  ok: boolean;
  postgres: { ok: boolean; reason?: string };
  redis: { ok: boolean; reason?: string; required: boolean };
  elasticsearch: { ok: boolean; reason?: string; required: boolean };
  ftsIndex: { ok: boolean; reason?: string };
  ftsColumn: { ok: boolean; reason?: string };
  adminSeeded: { ok: boolean; reason?: string };
};

/**
 * Boot-time self-check. Each invariant from HARNESS.md is verified here and
 * a repair command is logged on failure. The API still boots (warnings only)
 * unless Postgres is unreachable — Postgres is the only hard dependency.
 */
@Injectable()
export class SelfCheckService {
  private readonly logger = new Logger('SelfCheck');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly es?: ElasticsearchService,
  ) {}

  async run(): Promise<SelfCheckReport> {
    const report: SelfCheckReport = {
      ok: true,
      postgres: await this.checkPostgres(),
      redis: await this.checkRedis(),
      elasticsearch: await this.checkElasticsearch(),
      ftsColumn: await this.checkFtsColumn(),
      ftsIndex: await this.checkFtsIndex(),
      adminSeeded: await this.checkAdminSeeded(),
    };

    report.ok =
      report.postgres.ok &&
      report.ftsColumn.ok &&
      report.ftsIndex.ok &&
      report.adminSeeded.ok;

    this.print(report);
    return report;
  }

  private async checkPostgres() {
    const ok = await this.prisma.ping();
    if (!ok) {
      return {
        ok: false,
        reason:
          'Postgres unreachable. Repair: `docker compose -f infra/docker-compose.yml up -d postgres` and verify DATABASE_URL.',
      };
    }
    return { ok: true };
  }

  private async checkRedis() {
    const url = this.config.get<string>('REDIS_URL');
    const required = false; // soft for now; queues degrade if absent
    if (!url) {
      return {
        ok: false,
        required,
        reason: 'REDIS_URL not set — queues disabled. Set in .env to enable.',
      };
    }
    try {
      const r = new IORedis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
      await r.connect();
      const pong = await r.ping();
      await r.quit();
      return { ok: pong === 'PONG', required };
    } catch (e) {
      return {
        ok: false,
        required,
        reason: `Redis unreachable: ${(e as Error).message}. Repair: \`docker compose up -d redis\`.`,
      };
    }
  }

  private async checkElasticsearch() {
    const url = this.config.get<string>('ELASTICSEARCH_URL');
    if (!url || !this.es) {
      return {
        ok: false,
        required: false,
        reason: 'ELASTICSEARCH_URL not set — falling back to Postgres FTS.',
      };
    }
    try {
      const ok = await this.es.ping();
      return { ok, required: false };
    } catch (e) {
      return {
        ok: false,
        required: false,
        reason: `Elasticsearch unreachable: ${(e as Error).message}. Repair: \`docker compose up -d elasticsearch\`.`,
      };
    }
  }

  private async checkFtsColumn() {
    try {
      const rows: Array<{ column_name: string }> = await this.prisma.$queryRawUnsafe(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'Result' AND column_name = 'searchVector'
      `);
      if (!rows.length) {
        return {
          ok: false,
          reason:
            'Result.searchVector column missing. Repair: re-run prisma migrations — `cd apps/api && npx prisma migrate deploy`.',
        };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: `Could not introspect Result schema: ${(e as Error).message}` };
    }
  }

  private async checkFtsIndex() {
    try {
      const rows: Array<{ indexname: string }> = await this.prisma.$queryRawUnsafe(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'Result' AND indexname = 'idx_result_search_vector'
      `);
      if (!rows.length) {
        return {
          ok: false,
          reason:
            'GIN index idx_result_search_vector missing. Repair: `psql $DATABASE_URL -c "CREATE INDEX CONCURRENTLY idx_result_search_vector ON \\"Result\\" USING GIN (\\"searchVector\\");"`',
        };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: `pg_indexes lookup failed: ${(e as Error).message}` };
    }
  }

  private async checkAdminSeeded() {
    try {
      const count = await this.prisma.user.count({ where: { role: 'ADMIN', active: true } });
      if (count === 0) {
        return {
          ok: false,
          reason:
            'No active admin user. Repair: AuthService.ensureAdmin runs on boot — check ADMIN_EMAIL/ADMIN_PASSWORD env vars.',
        };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: `User table inaccessible: ${(e as Error).message}` };
    }
  }

  private print(report: SelfCheckReport) {
    const fmt = (label: string, c: { ok: boolean; reason?: string; required?: boolean }) => {
      const tag = c.ok ? 'OK' : c.required === false ? 'WARN' : 'FAIL';
      const line = `[${tag}] ${label}`;
      if (c.ok) this.logger.log(line);
      else if (c.required === false) this.logger.warn(`${line} — ${c.reason}`);
      else this.logger.error(`${line} — ${c.reason}`);
    };
    fmt('postgres', report.postgres);
    fmt('redis', report.redis);
    fmt('elasticsearch', report.elasticsearch);
    fmt('fts column (Result.searchVector)', report.ftsColumn);
    fmt('fts index (idx_result_search_vector)', report.ftsIndex);
    fmt('admin seeded', report.adminSeeded);
    this.logger.log(report.ok ? 'self-check: OK' : 'self-check: degraded — see warnings above');
  }
}
