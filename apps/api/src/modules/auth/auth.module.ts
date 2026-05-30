import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { RecaptchaService } from './recaptcha.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // BillingModule exports BillingService so AuthService can fire a
    // best-effort Polar reconcile on sign-in and profile fetch — see
    // BillingService.reconcileFromPolar.
    BillingModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: `${config.get<number>('SESSION_DAYS', 14)}d` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RecaptchaService,
    // GoogleStrategy registers the 'google' passport strategy in its
    // constructor, which throws when clientID is empty. So only instantiate it
    // when Google OAuth is actually configured; otherwise the route 503s via
    // GoogleOauthGuard.
    {
      provide: GoogleStrategy,
      inject: [AuthService, ConfigService],
      useFactory: (auth: AuthService, config: ConfigService) => {
        const id = config.get<string>('GOOGLE_CLIENT_ID');
        const secret = config.get<string>('GOOGLE_CLIENT_SECRET');
        if (!id || !secret) return null;
        return new GoogleStrategy(auth, config);
      },
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
