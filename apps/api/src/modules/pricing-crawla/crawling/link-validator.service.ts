import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

export type LinkValidation = {
  ok: boolean;
  status: number | null;
  finalUrl: string;
  reason: string | null;
};

/**
 * Verifies that a URL actually resolves to a live page.
 *
 * Tries HEAD first (cheap), falls back to a GET-with-immediate-abort
 * pattern when the server doesn't support HEAD (405 / 403 / 501 are all
 * common). Follows up to 3 redirects through `redirect: 'follow'` so
 * shortened or marketing-redirect URLs still count as live.
 *
 * Network errors, non-2xx/3xx final status, and timeouts return `ok: false`
 * with a short reason — callers (the processor) drop those listings
 * before persistence so the user never sees a dead link.
 */
@Injectable()
export class LinkValidatorService {
  private readonly logger = new Logger(LinkValidatorService.name);
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(config: ConfigService) {
    this.timeoutMs = Number(config.get<string>('LINK_VALIDATOR_TIMEOUT_MS') ?? 8000);
    this.userAgent = config.get<string>(
      'USER_AGENT',
      'Mozilla/5.0 (compatible; CRWLA/1.0; +https://crwla.com/bot)',
    );
  }

  async validate(rawUrl: string): Promise<LinkValidation> {
    let url: string;
    try {
      url = new URL(rawUrl).toString();
    } catch {
      return { ok: false, status: null, finalUrl: rawUrl, reason: 'invalid url' };
    }

    const head = await this.attempt(url, 'HEAD');
    if (head.ok) return head;
    // Common pattern: anti-bot middleware allows GET but blocks HEAD.
    if (head.status === 405 || head.status === 403 || head.status === 501 || head.status === null) {
      const get = await this.attempt(url, 'GET');
      if (get.ok) return get;
      return get;
    }
    return head;
  }

  private async attempt(url: string, method: 'HEAD' | 'GET'): Promise<LinkValidation> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: {
          'User-Agent': this.userAgent,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: ctrl.signal,
      });
      const finalUrl = res.url || url;
      const status = res.status;
      if (status >= 200 && status < 400) {
        return { ok: true, status, finalUrl, reason: null };
      }
      return {
        ok: false,
        status,
        finalUrl,
        reason: `${method} ${status}`,
      };
    } catch (e) {
      const msg = (e as Error).name === 'AbortError' ? 'timeout' : String((e as Error).message ?? e);
      return { ok: false, status: null, finalUrl: url, reason: msg };
    } finally {
      clearTimeout(t);
    }
  }
}
