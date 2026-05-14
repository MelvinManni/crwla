import { Injectable } from '@nestjs/common';
import { OnboardingFlow, OnboardingStatus, Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

export type OnboardingFlowView = {
  flow: OnboardingFlow;
  status: OnboardingStatus;
  startedAt: number;
};

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active (PENDING) flows for the user. Returns `[]` for admins so
   * internal accounts never see the walkthrough overlay. On a non-admin's
   * first call, auto-creates the FIRST_LOGIN row so the dashboard tour
   * fires the first time they land.
   */
  async listActive(userId: string, role: Role): Promise<OnboardingFlowView[]> {
    if (role === Role.ADMIN) return [];
    await this.ensureFirstLogin(userId);
    const rows = await this.prisma.onboardingState.findMany({
      where: { userId, status: OnboardingStatus.PENDING },
      orderBy: { startedAt: 'asc' },
    });
    return rows.map((r) => ({
      flow: r.flow,
      status: r.status,
      startedAt: r.startedAt.getTime(),
    }));
  }

  async dismiss(userId: string, flow: OnboardingFlow): Promise<{ ok: true }> {
    await this.prisma.onboardingState.upsert({
      where: { userId_flow: { userId, flow } },
      create: {
        userId,
        flow,
        status: OnboardingStatus.DISMISSED,
        dismissedAt: new Date(),
      },
      update: {
        status: OnboardingStatus.DISMISSED,
        dismissedAt: new Date(),
      },
    });
    return { ok: true };
  }

  async complete(userId: string, flow: OnboardingFlow): Promise<{ ok: true }> {
    await this.prisma.onboardingState.upsert({
      where: { userId_flow: { userId, flow } },
      create: {
        userId,
        flow,
        status: OnboardingStatus.COMPLETED,
        completedAt: new Date(),
      },
      update: {
        status: OnboardingStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    return { ok: true };
  }

  /**
   * Called from SearchesService.create() right after the row is inserted.
   * No-op for admins. Idempotent — the unique (userId, flow) constraint
   * means subsequent crawl creates never produce a second FIRST_CRAWL
   * row. We don't replace a COMPLETED/DISMISSED row either, so a user
   * who dismissed it doesn't get it again on their second crawl.
   */
  async ensureFirstCrawl(userId: string, role: Role): Promise<void> {
    if (role === Role.ADMIN) return;
    const existing = await this.prisma.onboardingState.findUnique({
      where: { userId_flow: { userId, flow: OnboardingFlow.FIRST_CRAWL } },
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.onboardingState.create({
      data: {
        userId,
        flow: OnboardingFlow.FIRST_CRAWL,
        status: OnboardingStatus.PENDING,
      },
    });
  }

  private async ensureFirstLogin(userId: string): Promise<void> {
    const existing = await this.prisma.onboardingState.findUnique({
      where: { userId_flow: { userId, flow: OnboardingFlow.FIRST_LOGIN } },
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.onboardingState.create({
      data: {
        userId,
        flow: OnboardingFlow.FIRST_LOGIN,
        status: OnboardingStatus.PENDING,
      },
    });
  }
}
