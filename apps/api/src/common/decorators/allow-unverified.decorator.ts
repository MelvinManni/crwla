import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNVERIFIED = 'allowUnverified';

/**
 * Opt a route out of the email-verification gate enforced by JwtAuthGuard.
 * Authentication is still required — only the `emailVerifiedAt` check is
 * skipped. Use on the handful of endpoints an unverified user must reach to
 * recover (view own profile, sign out, resend the verification email).
 */
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED, true);
