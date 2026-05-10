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
    status: string;
    keywords: string[];
    lastRun: string;
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
  const list = parseListParams(sp, { pageSize: 25, view: 'list' });

  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  let data: ApiOut;
  try {
    data = await api.get<ApiOut>(
      `/searches/${id}/results?page=${list.page}&pageSize=${list.pageSize}`,
      { cookie },
    );
  } catch {
    notFound();
  }

  return <ResultsClient initial={data} listParams={list} />;
}
