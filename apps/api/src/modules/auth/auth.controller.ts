import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AuthService } from './auth.service';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RequestAccessDto } from './dto/request-access.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { RecaptchaGuard } from './guards/recaptcha.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AllowUnverified } from '../../common/decorators/allow-unverified.decorator';
import { IsStrongPasswordField } from '../../common/validators/strong-password.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';

class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(1) firstName?: string;
  @IsOptional() @IsString() lastName?: string | null;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() team?: string | null;
  @IsOptional() @IsString() currentPassword?: string;
  // newPassword requires currentPassword; the service rejects if it's missing.
  @ValidateIf((o: UpdateProfileDto) => typeof o.newPassword === 'string')
  @IsStrongPasswordField()
  newPassword?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Set the httpOnly session cookie carrying the signed JWT. */
  private setSessionCookie(res: Response, token: string) {
    res.cookie(this.config.get<string>('COOKIE_NAME', 'crwla_token'), token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * (this.config.get<number>('SESSION_DAYS', 14) ?? 14),
      secure: this.config.get<string>('NODE_ENV') === 'production',
    });
  }

  // Stricter than the global limit + captcha-gated: credential-stuffing and
  // signup-spam are the abuse cases we most want to slow down.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(RecaptchaGuard)
  @Post('signin')
  @HttpCode(200)
  async signin(@Body() dto: SigninDto, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.signin(dto.email, dto.password);
    this.setSessionCookie(res, out.token);
    return out;
  }

  /**
   * Self-serve signup (no admin approval). Creates the account, emails a
   * verification link, and signs the user in immediately — but every protected
   * route stays blocked (403 EMAIL_NOT_VERIFIED) until they verify.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(RecaptchaGuard)
  @Post('signup')
  @HttpCode(201)
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.signup(dto);
    this.setSessionCookie(res, out.token);
    return { ...out, emailVerificationRequired: true };
  }

  /**
   * Confirm the emailed verification token. Public (the token is the secret).
   * On success it refreshes the session cookie so the just-verified user is
   * immediately un-gated.
   */
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.verifyEmail(dto.token);
    this.setSessionCookie(res, out.token);
    return out;
  }

  @UseGuards(JwtAuthGuard)
  @AllowUnverified()
  @Post('resend-verification')
  @HttpCode(200)
  resendVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.resendVerification(user.id);
  }

  // --- Google OAuth (authorization-code redirect flow) ----------------------

  /** Kicks off the redirect to Google's consent screen. */
  @UseGuards(GoogleOauthGuard)
  @Get('google')
  googleAuth() {
    // GoogleOauthGuard issues the 302 to Google; this body never runs.
  }

  /** Google redirects back here with the auth code (or an error/cancel). */
  @UseGuards(GoogleOauthGuard)
  @Get('google/callback')
  googleCallback(
    @Req() req: Request & { googleAuthError?: string },
    @Res() res: Response,
  ) {
    const webBase = this.config.get<string>('WEB_BASE_URL', 'http://localhost:3000');
    // GoogleStrategy.validate resolved the user row onto req.user. If it's
    // missing, the user canceled consent or auth failed — GoogleOauthGuard
    // stashed the reason instead of throwing, so bounce back to the app with
    // an `?error=` the sign-in page surfaces as a toast.
    const user = req.user as { id: string; email: string; role: 'ADMIN' | 'MEMBER' } | undefined;
    if (!user) {
      const reason = req.googleAuthError || 'Google sign-in was canceled';
      return res.redirect(`${webBase}/signin?error=${encodeURIComponent(reason)}`);
    }
    const token = this.auth.signToken(user);
    this.setSessionCookie(res, token);
    return res.redirect(`${webBase}/dashboard`);
  }

  @Post('signout')
  @HttpCode(200)
  signout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.config.get<string>('COOKIE_NAME', 'crwla_token'));
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @AllowUnverified()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.auth.updateProfile(user.id, dto);
    return { user: updated };
  }

  @UseGuards(JwtAuthGuard)
  @AllowUnverified()
  @Delete('me')
  @HttpCode(200)
  async deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.softDeleteUser(user.id);
    res.clearCookie(this.config.get<string>('COOKIE_NAME', 'crwla_token'));
    return { ok: true };
  }

  /**
   * @deprecated Superseded by direct self-serve `POST /auth/signup`. Retained
   * for the admin-approval flow (/admin/requests) but no longer the primary
   * path for new users. Slated for removal once the FE fully migrates.
   */
  @Post('request-access')
  @HttpCode(200)
  async requestAccess(@Body() dto: RequestAccessDto) {
    const created = await this.prisma.accessRequest.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash: this.auth.hashPassword(dto.password),
        team: dto.team ?? null,
        reason: dto.reason ?? null,
      },
    });
    return { ok: true, id: created.id };
  }
}
