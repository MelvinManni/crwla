import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

type SiteVerifyResponse = {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
};

/**
 * Verifies reCAPTCHA v3 tokens against Google's siteverify endpoint.
 *
 * When `RECAPTCHA_SECRET_KEY` is unset the whole check is a no-op (returns
 * cleanly) so local dev / CI never blocks on missing keys — same opt-in
 * pattern as Google OAuth and Mailtrap. Once the secret is set, a missing or
 * low-scoring token is rejected with 400.
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('RECAPTCHA_SECRET_KEY');
  }

  async verify(token: string | undefined, remoteIp?: string): Promise<void> {
    const secret = this.config.get<string>('RECAPTCHA_SECRET_KEY');
    if (!secret) return; // not configured — skip verification

    if (!token) {
      throw new BadRequestException({
        message: 'captcha token missing',
        code: 'RECAPTCHA_REQUIRED',
      });
    }

    const minScore = this.config.get<number>('RECAPTCHA_MIN_SCORE', 0.5) ?? 0.5;
    let body: SiteVerifyResponse;
    try {
      const params = new URLSearchParams({ secret, response: token });
      if (remoteIp) params.set('remoteip', remoteIp);
      const res = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      body = (await res.json()) as SiteVerifyResponse;
    } catch (e) {
      // Network/Google outage — fail closed but log loudly.
      this.logger.error(`siteverify call failed: ${(e as Error).message}`);
      throw new BadRequestException({
        message: 'captcha verification unavailable',
        code: 'RECAPTCHA_UNAVAILABLE',
      });
    }

    if (!body.success || (typeof body.score === 'number' && body.score < minScore)) {
      this.logger.warn(
        `captcha rejected (success=${body.success} score=${body.score ?? 'n/a'} ` +
          `codes=${(body['error-codes'] ?? []).join(',')})`,
      );
      throw new BadRequestException({
        message: 'captcha verification failed',
        code: 'RECAPTCHA_FAILED',
      });
    }
  }
}
