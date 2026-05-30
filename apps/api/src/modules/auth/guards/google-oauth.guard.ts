import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

/**
 * Wraps the 'google' passport strategy. Returns 503 (instead of an opaque
 * "Unknown strategy" 500) when Google OAuth isn't configured, and runs
 * sessionless since the API has no express-session middleware.
 */
@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  getAuthenticateOptions() {
    return { session: false };
  }

  canActivate(context: ExecutionContext) {
    const configured =
      !!this.config.get<string>('GOOGLE_CLIENT_ID') &&
      !!this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!configured) {
      throw new ServiceUnavailableException('google sign-in is not configured');
    }
    return super.canActivate(context);
  }

  /**
   * Don't throw a raw 401/500 when the user cancels consent or auth fails —
   * Google still redirects back to our callback. Swallow the error, stash a
   * human-readable reason on the request, and let the callback handler bounce
   * the browser back to the app (with `?error=`) so the FE can toast it.
   */
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const req = context.switchToHttp().getRequest<Request & { googleAuthError?: string }>();
      const reason =
        (info as { message?: string } | undefined)?.message ||
        (err as { message?: string } | undefined)?.message ||
        'Google sign-in was canceled';
      req.googleAuthError = reason;
      return null as TUser;
    }
    return user;
  }
}
