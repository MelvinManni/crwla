import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RecaptchaService } from '../recaptcha.service';

/**
 * Verifies the `recaptchaToken` carried in the request body before the handler
 * runs. No-ops when reCAPTCHA isn't configured (see RecaptchaService). Place on
 * abuse-prone public routes (signin, signup).
 */
@Injectable()
export class RecaptchaGuard implements CanActivate {
  constructor(private readonly recaptcha: RecaptchaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { body?: { recaptchaToken?: string } }>();
    await this.recaptcha.verify(req.body?.recaptchaToken, req.ip);
    return true;
  }
}
