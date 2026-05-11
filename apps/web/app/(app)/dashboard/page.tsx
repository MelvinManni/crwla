import { cookies } from 'next/headers';
import { StartCrawlButton } from '@/components/start-crawl-button';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import type { SearchView } from '@/lib/types';
import { parseListParams } from '@/lib/list-state';
import { DashboardClient } from './dashboard-client';

type ApiOut = {
  jobs: SearchView[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const sp = await searchParams;
  const params = parseListParams(sp, { pageSize: 20, view: 'list' });

  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize));
  if (params.q) qs.set('q', params.q);
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.time !== 'all') qs.set('time', params.time);
  const out = await api.get<ApiOut>(`/searches?${qs.toString()}`, { cookie });

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Crawls</h1>
          <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
            {out.total} {out.total === 1 ? 'CRAWL' : 'CRAWLS'} · {user.email}
          </p>
        </div>
        <StartCrawlButton hideOnMobile />
      </div>

      <DashboardClient initial={out.jobs} total={out.total} listParams={params} />
    </div>
  );
}
