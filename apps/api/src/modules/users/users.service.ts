import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ActivityService } from '../activity/activity.service';
import { Role } from '@prisma/client';

function relTime(t: Date | null | undefined): string {
  if (!t) return 'never';
  const diff = Date.now() - t.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly activity: ActivityService,
  ) {}

  async list() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      team: u.team ?? '—',
      role: u.role === Role.ADMIN ? 'Admin' : 'Member',
      last: relTime(u.lastActiveAt ?? u.createdAt),
      active: u.active,
      disabledSourceCategories: u.disabledSourceCategories,
    }));
  }

  async create(input: {
    name: string;
    email: string;
    password: string;
    team?: string | null;
    role?: 'admin' | 'member';
  }) {
    const created = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: this.auth.hashPassword(input.password),
        team: input.team ?? null,
        role: input.role === 'admin' ? Role.ADMIN : Role.MEMBER,
        active: true,
      },
    });
    return { ok: true, id: created.id };
  }

  async detail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        _count: {
          select: {
            searches: { where: { deletedAt: null } },
            alerts: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('not found');

    const stats = await this.activity.statsForUser(id, 30);

    const sub = user.subscription;
    const subscription = sub
      ? {
          status: sub.status,
          interval: sub.interval,
          planTier: sub.plan.tier,
          planName: sub.plan.name,
          priceMonthlyCents: sub.plan.priceMonthlyCents,
          priceYearlyCents: sub.plan.priceYearlyCents,
          seats: sub.seats,
          currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          canceledAt: sub.canceledAt?.toISOString() ?? null,
          createdAt: sub.createdAt.toISOString(),
        }
      : null;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        team: user.team ?? '—',
        role: user.role === Role.ADMIN ? 'Admin' : 'Member',
        last: relTime(user.lastActiveAt ?? user.createdAt),
        lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        active: user.active,
        disabledSourceCategories: user.disabledSourceCategories,
        searchCount: user._count.searches,
        alertCount: user._count.alerts,
      },
      subscription,
      stats,
    };
  }

  async patch(
    id: string,
    input: {
      active?: boolean;
      role?: 'admin' | 'member';
      disabledSourceCategories?: string[];
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('not found');
    const data: { active?: boolean; role?: Role; disabledSourceCategories?: string[] } = {};
    if (typeof input.active === 'boolean') data.active = input.active;
    if (input.role === 'admin') data.role = Role.ADMIN;
    if (input.role === 'member') data.role = Role.MEMBER;
    if (Array.isArray(input.disabledSourceCategories)) {
      // Whitelist filter — only known SourceCategory values land in the column.
      const allowed = new Set(['news', 'social', 'forums', 'blogs']);
      data.disabledSourceCategories = input.disabledSourceCategories.filter((c) =>
        allowed.has(c),
      );
    }
    if (Object.keys(data).length) {
      await this.prisma.user.update({ where: { id }, data });
    }
    return { ok: true };
  }
}
