import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
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
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
