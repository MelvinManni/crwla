import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService, SessionUser } from './auth.service';

type JwtPayload = { sub: string; email: string; role: 'ADMIN' | 'MEMBER' };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[config.get<string>('COOKIE_NAME', 'crwla_token')] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<SessionUser> {
    const user = await this.auth.getUserById(payload.sub);
    if (!user) throw new UnauthorizedException('unauthenticated');
    return user;
  }
}
