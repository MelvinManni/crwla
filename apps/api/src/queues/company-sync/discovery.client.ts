import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

/**
 * Thin HTTP client for the standalone `crwla-company-discovery` service.
 *
 * It exposes a token-guarded `GET /companies` extract endpoint (paginated,
 * `x-api-token` header). When `DISCOVERY_SERVICE_URL` is unset the client is
 * disabled and callers no-op. Network / non-2xx / timeout all return null and
 * log a warning — we never throw from here.
 */
export interface DiscoveryCompany {
  name: string;
  careerUrl: string;
  selector: string | null;
  status: string;
  crawlIntervalMin: number;
  jobCount: number;
  metadata: Record<string, unknown> | null;
  updatedAt: string | null;
}

export interface DiscoveryPage {
  total: number;
  count: number;
  companies: DiscoveryCompany[];
}

@Injectable()
export class DiscoveryClient {
  private readonly logger = new Logger(DiscoveryClient.name);
  private readonly baseUrl: string | null;
  private readonly token: string | null;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    const url = config.get<string>('DISCOVERY_SERVICE_URL');
    this.baseUrl = url ? url.replace(/\/$/, '') : null;
    this.token = config.get<string>('DISCOVERY_API_TOKEN') || null;
    this.timeoutMs = Number(
      config.get<string>('DISCOVERY_SERVICE_TIMEOUT_MS') ?? 30_000,
    );
  }

  isEnabled(): boolean {
    return this.baseUrl !== null;
  }

  /** Fetch one page of verified companies, or null on error. */
  async fetchPage(offset: number, limit: number): Promise<DiscoveryPage | null> {
    if (!this.baseUrl) return null;
    const url = `${this.baseUrl}/companies?limit=${limit}&offset=${offset}`;
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          ...(this.token ? { 'x-api-token': this.token } : {}),
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!r.ok) {
        this.logger.warn(`GET /companies ${r.status}: ${await safeBody(r)}`);
        return null;
      }
      const data = (await r.json()) as {
        total?: number;
        count?: number;
        companies?: Array<Record<string, unknown>>;
      };
      const companies: DiscoveryCompany[] = (data.companies ?? []).map((c) => ({
        name: String(c.name ?? ''),
        careerUrl: String(c.career_url ?? ''),
        selector: (c.selector as string | null) ?? null,
        status: String(c.status ?? 'ACTIVE'),
        crawlIntervalMin: Number(c.crawl_interval_min ?? 15),
        jobCount: Number(c.job_count ?? 0),
        metadata: (c.metadata as Record<string, unknown> | null) ?? null,
        updatedAt: (c.updated_at as string | null) ?? null,
      }));
      return {
        total: Number(data.total ?? companies.length),
        count: Number(data.count ?? companies.length),
        companies,
      };
    } catch (e) {
      this.logger.warn(`GET /companies failed: ${(e as Error).message}`);
      return null;
    }
  }
}

async function safeBody(r: { text(): Promise<string> }): Promise<string> {
  try {
    return (await r.text()).slice(0, 200);
  } catch {
    return '<no body>';
  }
}
