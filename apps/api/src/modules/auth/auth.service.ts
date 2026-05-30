import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { BillingService } from '../billing/billing.service';
import { ActivityService } from '../activity/activity.service';
import { MailService } from '../../core/mail/mail.service';
import { MailerService } from '../../core/mail/mailer.service';
import { splitName } from '../../common/name.util';

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: Role;
  team: string | null;
  /** False until the user confirms via the emailed verification link. */
  emailVerified: boolean;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly billing: BillingService,
    private readonly activity: ActivityService,
    private readonly mail: MailService,
    private readonly mailer: MailerService,
  ) {}

  hashPassword(plain: string): string {
    return bcrypt.hashSync(plain, 10);
  }

  verifyPassword(plain: string, hash: string): boolean {
    return bcrypt.compareSync(plain, hash);
  }

  signToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
    return this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
  }

  /** Single source of truth for the public session shape sent to the FE. */
  private toSessionUser(user: User): SessionUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      team: user.team,
      emailVerified: user.emailVerifiedAt !== null,
    };
  }

  async signin(email: string, password: string): Promise<{ token: string; user: SessionUser }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException('invalid credentials');
    }
    // Google-only account — no local password to check against.
    if (!user.passwordHash) {
      throw new UnauthorizedException('this account uses Google sign-in');
    }
    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('invalid credentials');
    }
    // Unverified users are intentionally allowed to sign in: they receive a
    // session but JwtAuthGuard blocks protected routes until they verify.
    const token = this.signToken(user);
    // Self-heal stale FREE-tier rows against Polar in the background.
    // Fire-and-forget so a slow Polar API call never delays login; the
    // method swallows its own errors and rate-limits per-user internally.
    this.reconcileBilling(user.id);
    this.activity.log({ userId: user.id, type: 'auth.signin' });
    return { token, user: this.toSessionUser(user) };
  }

  /**
   * Self-serve email/password signup — no admin approval. Creates the account
   * immediately and emails a verification link; the caller is signed in but
   * gated (see JwtAuthGuard) until the link is used.
   */
  async signup(input: {
    firstName: string;
    lastName?: string | null;
    email: string;
    password: string;
    team?: string | null;
  }): Promise<{ token: string; user: SessionUser }> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('email already in use');

    const user = await this.prisma.user.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() || null,
        email,
        passwordHash: this.hashPassword(input.password),
        team: input.team?.trim() || null,
        role: Role.MEMBER,
        active: true,
        // emailVerifiedAt stays null — the account is gated until verified.
      },
    });

    await this.sendVerificationEmail(user).catch((e) => {
      // Don't fail signup if the mail step throws; the user can resend.
      this.logger.error(`signup verification email failed for ${email}: ${(e as Error).message}`);
    });

    this.activity.log({ userId: user.id, type: 'auth.signup' });
    const token = this.signToken(user);
    return { token, user: this.toSessionUser(user) };
  }

  async getUserById(id: string): Promise<SessionUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.active || user.deletedAt) return null;
    await this.prisma.user.update({ where: { id }, data: { lastActiveAt: new Date() } });
    // Same self-heal on profile fetch — covers users already holding a
    // valid JWT who never see `signin` again. The reconcile method
    // rate-limits per user, so this is safe to call on every /auth/me.
    this.reconcileBilling(id);
    return this.toSessionUser(user);
  }

  /**
   * Update the current user's profile. `email` is lower-cased; an attempt to
   * collide with another user's email surfaces as 409. Password rotation is
   * gated on the caller proving they know the current one.
   */
  async updateProfile(
    userId: string,
    input: {
      firstName?: string;
      lastName?: string | null;
      email?: string;
      team?: string | null;
      currentPassword?: string;
      newPassword?: string;
    },
  ): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active || user.deletedAt) throw new NotFoundException('not found');

    const data: {
      firstName?: string;
      lastName?: string | null;
      email?: string;
      team?: string | null;
      passwordHash?: string;
    } = {};

    if (typeof input.firstName === 'string' && input.firstName.trim()) {
      data.firstName = input.firstName.trim();
    }
    if (typeof input.lastName === 'string' || input.lastName === null) {
      data.lastName = input.lastName?.trim() || null;
    }
    if (typeof input.team === 'string' || input.team === null) data.team = input.team;

    if (typeof input.email === 'string' && input.email.trim()) {
      const nextEmail = input.email.trim().toLowerCase();
      if (nextEmail !== user.email) {
        const taken = await this.prisma.user.findUnique({ where: { email: nextEmail } });
        if (taken) throw new ConflictException('email already in use');
        data.email = nextEmail;
      }
    }

    if (input.newPassword) {
      if (!input.currentPassword) {
        throw new BadRequestException('current password required');
      }
      // Google-only accounts have no password to rotate from.
      if (!user.passwordHash) {
        throw new BadRequestException('this account has no password set');
      }
      if (!this.verifyPassword(input.currentPassword, user.passwordHash)) {
        throw new UnauthorizedException('current password is incorrect');
      }
      if (input.newPassword.length < 8) {
        throw new BadRequestException('new password must be at least 8 characters');
      }
      data.passwordHash = this.hashPassword(input.newPassword);
    }

    if (Object.keys(data).length === 0) {
      return this.toSessionUser(user);
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    this.activity.log({
      userId,
      type: 'auth.profile_updated',
      metadata: { changed: Object.keys(data) },
    });
    return this.toSessionUser(updated);
  }

  /**
   * Soft-delete the current user. Row stays so audit/billing FKs keep
   * pointing somewhere, but signin and /auth/me start refusing the
   * account from here on (both gates check `deletedAt`).
   */
  async softDeleteUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('not found');
    if (user.deletedAt) return; // already deleted, idempotent
    await this.prisma.user.update({
      where: { id: userId },
      data: { active: false, deletedAt: new Date() },
    });
    this.activity.log({ userId, type: 'auth.account_deleted' });
  }

  /**
   * Mint a fresh single-use verification token for `user`, clear any older
   * ones, and email the link. Only the SHA-256 hash is persisted; the raw
   * token travels only in the email.
   */
  private async sendVerificationEmail(user: Pick<User, 'id' | 'email' | 'firstName'>): Promise<void> {
    const raw = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(raw);
    const ttlHours = this.config.get<number>('EMAIL_VERIFICATION_TTL_HOURS', 24) ?? 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    // One live token per user — drop the rest before issuing a new one.
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const webBase = this.config.get<string>('WEB_BASE_URL', 'http://localhost:3000');
    const link = `${webBase}/verify-email?token=${raw}`;
    await this.mailer.sendVerification(user.email, {
      firstName: user.firstName,
      email: user.email,
      verificationUrl: link,
      ttlHours,
    });
  }

  /**
   * Confirm an email-verification token. Stamps `emailVerifiedAt`, clears the
   * user's tokens, and returns a fresh session so the caller can refresh the
   * cookie. Throws on unknown/expired tokens.
   */
  async verifyEmail(rawToken: string): Promise<{ token: string; user: SessionUser }> {
    const row = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!row) throw new BadRequestException('invalid or expired verification link');
    if (row.expiresAt.getTime() < Date.now()) {
      await this.prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } });
      throw new BadRequestException('verification link expired — request a new one');
    }

    const user = await this.prisma.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } });
    this.activity.log({ userId: user.id, type: 'auth.email_verified' });
    return { token: this.signToken(user), user: this.toSessionUser(user) };
  }

  /**
   * Re-send the verification email for the current user. No-op (still returns
   * ok) when the account is already verified, so callers never leak state.
   */
  async resendVerification(userId: string): Promise<{ ok: true; alreadyVerified: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active || user.deletedAt) throw new NotFoundException('not found');
    if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };
    await this.sendVerificationEmail(user);
    return { ok: true, alreadyVerified: false };
  }

  /**
   * Resolve the user behind a Google sign-in. Matches by `googleId` first,
   * then links an existing same-email account, otherwise provisions a new
   * verified account (Google has already proven the address). Always returns
   * a verified, active user.
   */
  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName?: string | null;
  }): Promise<User> {
    const email = profile.email.trim().toLowerCase();

    const byGoogle = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (byGoogle) {
      if (!byGoogle.active || byGoogle.deletedAt) {
        throw new UnauthorizedException('account disabled');
      }
      return byGoogle;
    }

    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (!byEmail.active || byEmail.deletedAt) {
        throw new UnauthorizedException('account disabled');
      }
      // Link Google to the existing local account and treat email as verified.
      const linked = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.googleId,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
        },
      });
      this.activity.log({ userId: linked.id, type: 'auth.google_linked' });
      return linked;
    }

    const created = await this.prisma.user.create({
      data: {
        firstName: profile.firstName?.trim() || email.split('@')[0],
        lastName: profile.lastName?.trim() || null,
        email,
        googleId: profile.googleId,
        role: Role.MEMBER,
        active: true,
        emailVerifiedAt: new Date(),
        // passwordHash left null — this is a Google-only account.
      },
    });
    this.activity.log({ userId: created.id, type: 'auth.signup', metadata: { via: 'google' } });
    return created;
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private reconcileBilling(userId: string): void {
    void this.billing.reconcileFromPolar(userId).catch((e) => {
      this.logger.warn(`reconcileBilling(${userId}) crashed: ${(e as Error).message}`);
    });
  }

  /**
   * Idempotent. If no users exist, creates the seed admin from env vars.
   * Logs the seeded credentials once so they appear in operator logs.
   */
  async ensureAdmin(): Promise<void> {
    const count = await this.prisma.user.count();
    if (count > 0) return;
    const email = (this.config.get<string>('ADMIN_EMAIL') ?? 'admin@crwla.io').toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD') ?? 'admin';
    const { firstName, lastName } = splitName(this.config.get<string>('ADMIN_NAME') ?? 'Admin');
    await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash: this.hashPassword(password),
        team: 'Engineering',
        role: Role.ADMIN,
        active: true,
        emailVerifiedAt: new Date(),
      },
    });
    this.logger.log(`seeded admin: ${email} / ${password}`);
  }
}
