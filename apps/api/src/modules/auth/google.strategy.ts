import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { splitName } from '../../common/name.util';

/**
 * Google OAuth (authorization-code) strategy. Registered under the name
 * 'google'. Only instantiated when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are
 * present (see AuthModule's factory provider) — the Google Strategy throws at
 * construction when the clientID is missing.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? '',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        done(new UnauthorizedException('google account has no email'), undefined);
        return;
      }
      // Prefer Google's structured given/family names; fall back to splitting
      // the display name when they're absent.
      const fallback = splitName(profile.displayName ?? '');
      const user = await this.auth.findOrCreateGoogleUser({
        googleId: profile.id,
        email,
        firstName: profile.name?.givenName || fallback.firstName,
        lastName: profile.name?.familyName || fallback.lastName,
      });
      // The resolved user row becomes req.user in the callback handler.
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
