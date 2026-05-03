import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AccessRequestStatus, Role } from '@prisma/client';

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
export class AccessRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPending() {
    const rows = await this.prisma.accessRequest.findMany({
      where: { status: AccessRequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      team: r.team ?? '—',
      reason: r.reason ?? '',
      requested: relTime(r.createdAt),
    }));
  }

  async approve(id: string) {
    const reqRow = await this.prisma.accessRequest.findUnique({ where: { id } });
    if (!reqRow) throw new NotFoundException('not found');
    const existing = await this.prisma.user.findUnique({
      where: { email: reqRow.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.accessRequest.update({
        where: { id },
        data: { status: AccessRequestStatus.APPROVED },
      });
      return { ok: true, alreadyMember: true };
    }
    await this.prisma.user.create({
      data: {
        name: reqRow.name,
        email: reqRow.email.toLowerCase(),
        passwordHash: reqRow.passwordHash,
        team: reqRow.team,
        role: Role.MEMBER,
        active: true,
      },
    });
    await this.prisma.accessRequest.update({
      where: { id },
      data: { status: AccessRequestStatus.APPROVED },
    });
    return { ok: true };
  }

  async deny(id: string) {
    const updated = await this.prisma.accessRequest.updateMany({
      where: { id, status: AccessRequestStatus.PENDING },
      data: { status: AccessRequestStatus.DENIED },
    });
    if (updated.count === 0) throw new NotFoundException('not found');
    return { ok: true };
  }
}
