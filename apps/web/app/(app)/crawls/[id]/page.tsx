import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import type { ResultView } from '@/lib/types';
import { parseListParams } from '@/lib/list-state';
import { ResultsClient } from './results-client';

type ApiOut = {
  job: {
    id: string;
    name: string;
    cron: string;
    filterPrompt: string;
    strict: boolean;
    status: string;
    keywords: string[];
    lastRun: string;
    publicAccess: boolean;
    shareSlug: string | null;
  };
  results: ResultView[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const list = parseListParams(sp, { pageSize: 20, view: 'list' });
  // Favorite-tab selection lives in the URL alongside list params so deep
  // links + back/forward navigation keep the active tab.
  const favorite = sp.favorite === '1' || sp.favorite === 'true';

  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  const qs = new URLSearchParams();
  qs.set('page', String(list.page));
  qs.set('pageSize', String(list.pageSize));
  if (list.q) qs.set('q', list.q);
  if (list.keyword) qs.set('keyword', list.keyword);
  if (list.time !== 'all') qs.set('time', list.time);
  qs.set('sort', list.sort);
  if (favorite) qs.set('favorite', '1');

  let data: ApiOut;
  try {
    data = await api.get<ApiOut>(`/searches/${id}/results?${qs.toString()}`, {
      cookie,
    });
  } catch {
    notFound();
  }

  return <ResultsClient initial={data} listParams={list} favorite={favorite} />;
}
