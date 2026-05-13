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
import { PrismaService } from '../../core/prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { BillingService } from '../billing/billing.service';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  team: string | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly billing: BillingService,
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

  async signin(email: string, password: string): Promise<{ token: string; user: SessionUser }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException('invalid credentials');
    }
    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('invalid credentials');
    }
    const token = this.signToken(user);
    // Self-heal stale FREE-tier rows against Polar in the background.
    // Fire-and-forget so a slow Polar API call never delays login; the
    // method swallows its own errors and rate-limits per-user internally.
    this.reconcileBilling(user.id);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team,
      },
    };
  }

  async getUserById(id: string): Promise<SessionUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.active || user.deletedAt) return null;
    await this.prisma.user.update({ where: { id }, data: { lastActiveAt: new Date() } });
    // Same self-heal on profile fetch — covers users already holding a
    // valid JWT who never see `signin` again. The reconcile method
    // rate-limits per user, so this is safe to call on every /auth/me.
    this.reconcileBilling(id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      team: user.team,
    };
  }

  /**
   * Update the current user's profile. `email` is lower-cased; an attempt to
   * collide with another user's email surfaces as 409. Password rotation is
   * gated on the caller proving they know the current one.
   */
  async updateProfile(
    userId: string,
    input: {
      name?: string;
      email?: string;
      team?: string | null;
      currentPassword?: string;
      newPassword?: string;
    },
  ): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active || user.deletedAt) throw new NotFoundException('not found');

    const data: {
      name?: string;
      email?: string;
      team?: string | null;
      passwordHash?: string;
    } = {};

    if (typeof input.name === 'string' && input.name.trim()) data.name = input.name.trim();
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
      if (!this.verifyPassword(input.currentPassword, user.passwordHash)) {
        throw new UnauthorizedException('current password is incorrect');
      }
      if (input.newPassword.length < 8) {
        throw new BadRequestException('new password must be at least 8 characters');
      }
      data.passwordHash = this.hashPassword(input.newPassword);
    }

    if (Object.keys(data).length === 0) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team,
      };
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      team: updated.team,
    };
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
    const name = this.config.get<string>('ADMIN_NAME') ?? 'Admin';
    await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash: this.hashPassword(password),
        team: 'Engineering',
        role: Role.ADMIN,
        active: true,
      },
    });
    this.logger.log(`seeded admin: ${email} / ${password}`);
  }
}
