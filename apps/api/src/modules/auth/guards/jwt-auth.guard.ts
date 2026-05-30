import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_UNVERIFIED } from '../../../common/decorators/allow-unverified.decorator';
import { SessionUser } from '../auth.service';

/**
 * JWT auth + email-verification gate. After Passport authenticates and sets
 * `req.user`, this rejects users whose email is unverified with a
 * `403 { code: 'EMAIL_NOT_VERIFIED' }` so the FE can prompt them to verify.
 * Routes decorated with `@AllowUnverified()` skip only the verification check.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authed = (await super.canActivate(context)) as boolean;
    if (!authed) return false;

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED,
      [context.getHandler(), context.getClass()],
    );
    if (allowUnverified) return true;

    const user = context.switchToHttp().getRequest<{ user?: SessionUser }>().user;
    if (user && !user.emailVerified) {
      throw new ForbiddenException({
        message: 'email not verified',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    return true;
  }
}
