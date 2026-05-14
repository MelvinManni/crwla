import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

function relTime(t: Date): string {
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
export class RunsService {
  constructor(private readonly prisma: PrismaService) {}

  async listFor(userId: string, searchId: string) {
    const search = await this.prisma.search.findFirst({
      where: { id: searchId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!search) throw new NotFoundException('not found');

    const runs = await this.prisma.run.findMany({
      where: { searchId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return runs.map((r) => ({
      id: r.id,
      startedAt: r.startedAt.getTime(),
      time: relTime(r.startedAt),
      duration: r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '—',
      count: r.resultsCount,
      status: r.status,
      error: r.error,
    }));
  }
}
