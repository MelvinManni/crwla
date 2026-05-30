import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import type {
  LlmExtractInput,
  LlmExtractResult,
  LlmProductListing,
  LlmProductSearchInput,
  LlmProductSearchResult,
} from './llm.types';

/**
 * Thin HTTP client for the standalone web-page-extractor-llm service.
 *
 * Behaviour:
 *   - When `LLM_SERVICE_URL` is unset, `extract()` returns null immediately
 *     so callers can no-op in environments without the LLM running.
 *   - Network errors, non-2xx responses, and timeouts all return null +
 *     log a warning. The caller is expected to have a deterministic
 *     fallback (we never throw from this client).
 *
 * Token budget: a single extraction call can take 5–30 s on CPU. Callers
 * should invoke this ONLY when their cheap deterministic parsers have
 * failed, never as the primary path.
 */
@Injectable()
export class LlmExtractorService {
  private readonly logger = new Logger(LlmExtractorService.name);
  private readonly baseUrl: string | null;
  private readonly timeoutMs: number;
  private readonly authHeader: string | null;

  constructor(config: ConfigService) {
    const url = config.get<string>('LLM_SERVICE_URL');
    this.baseUrl = url ? url.replace(/\/$/, '') : null;
    this.timeoutMs = Number(config.get<string>('LLM_SERVICE_TIMEOUT_MS') ?? 60_000);
    const token = config.get<string>('LLM_SERVICE_TOKEN');
    this.authHeader = token ? `Bearer ${token}` : null;
  }

  isEnabled(): boolean {
    return this.baseUrl !== null;
  }

  async extract(input: LlmExtractInput): Promise<LlmExtractResult | null> {
    if (!this.baseUrl) return null;
    if (!input.url && !input.html) {
      this.logger.warn('extract called with neither url nor html');
      return null;
    }

    try {
      const r = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.authHeader ? { authorization: this.authHeader } : {}),
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!r.ok) {
        this.logger.warn(`extract ${r.status}: ${await safeBody(r)}`);
        return null;
      }
      const data = (await r.json()) as Record<string, unknown>;
      // Map snake_case → camelCase so the rest of the api codebase stays
      // ts-idiomatic. Server schema lives in
      // apps/web-page-extractor-llm/src/schemas.py.
      return {
        output: (data.output as Record<string, unknown> | null) ?? null,
        cached: Boolean(data.cached),
        model: String(data.model ?? ''),
        tokensIn: Number(data.tokens_in ?? 0),
        tokensOut: Number(data.tokens_out ?? 0),
        latencyMs: Number(data.latency_ms ?? 0),
        confidence: Number(data.confidence ?? 0),
        fewShotUsed: ((data.few_shot_used as unknown[]) ?? []).map((e) => {
          const o = e as { bucket?: string; similarity?: number };
          return { bucket: o.bucket ?? '', similarity: Number(o.similarity ?? 0) };
        }),
        validationAttempts: ((data.validation_attempts as unknown[]) ?? []).map(String),
      };
    } catch (e) {
      this.logger.warn(`extract error: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Hand the LLM service a product query — it does the DDG search,
   * per-URL crawl, ranking, and returns the top results. Multi-minute
   * call: we extend the timeout proportionally because a product
   * search fans out to many crawls.
   */
  async searchProducts(
    input: LlmProductSearchInput,
  ): Promise<LlmProductSearchResult | null> {
    if (!this.baseUrl) return null;
    if (!input.query || input.query.trim().length < 2) {
      this.logger.warn('searchProducts called with empty query');
      return null;
    }

    // Each candidate URL can take 5–30 s. With up to ~30 candidates,
    // give the call up to 8× the regular timeout.
    const timeoutMs = Math.max(this.timeoutMs, 600_000);

    const body = {
      query: input.query.trim(),
      pages: input.pages,
      limit: input.limit,
      concurrency: input.concurrency,
      use_llm_fallback: input.useLlmFallback,
    };

    try {
      const r = await fetch(`${this.baseUrl}/search-products`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.authHeader ? { authorization: this.authHeader } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) {
        this.logger.warn(`searchProducts ${r.status}: ${await safeBody(r)}`);
        return null;
      }
      const data = (await r.json()) as Record<string, unknown>;
      const results = ((data.results as unknown[]) ?? []).map((row) => {
        const o = row as Record<string, unknown>;
        return {
          title: String(o.title ?? ''),
          price: Number(o.price ?? 0),
          currency: String(o.currency ?? 'USD'),
          url: String(o.url ?? ''),
          store: String(o.store ?? ''),
          image: typeof o.image === 'string' ? o.image : null,
          brand: typeof o.brand === 'string' ? o.brand : null,
          rating: typeof o.rating === 'number' ? o.rating : null,
          reviewCount: Number(o.review_count ?? 0),
          source: (o.source === 'llm' ? 'llm' : 'quick') as 'quick' | 'llm',
          confidence: Number(o.confidence ?? 0),
          rankScore: Number(o.rank_score ?? 0),
        } satisfies LlmProductListing;
      });
      const stats = (data.stats ?? {}) as Record<string, unknown>;
      return {
        query: String(data.query ?? input.query),
        results,
        stats: {
          searchHits: Number(stats.search_hits ?? 0),
          candidates: Number(stats.candidates ?? 0),
          kept: Number(stats.kept ?? 0),
          quickExtract: Number(stats.quick_extract ?? 0),
          llmExtract: Number(stats.llm_extract ?? 0),
          failed: Number(stats.failed ?? 0),
          elapsedMs: Number(stats.elapsed_ms ?? 0),
          pagesWalked: Number(stats.pages_walked ?? 0),
        },
      };
    } catch (e) {
      this.logger.warn(`searchProducts error: ${(e as Error).message}`);
      return null;
    }
  }

  async health(): Promise<{ status: 'ok' | 'unavailable'; reason?: string }> {
    if (!this.baseUrl) return { status: 'unavailable', reason: 'LLM_SERVICE_URL unset' };
    try {
      const r = await fetch(`${this.baseUrl}/ready`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return { status: 'unavailable', reason: `HTTP ${r.status}` };
      return { status: 'ok' };
    } catch (e) {
      return { status: 'unavailable', reason: (e as Error).message };
    }
  }
}

async function safeBody(r: Response | Awaited<ReturnType<typeof fetch>>): Promise<string> {
  try {
    const t = await (r as { text: () => Promise<string> }).text();
    return t.slice(0, 240);
  } catch {
    return '<unreadable>';
  }
}
