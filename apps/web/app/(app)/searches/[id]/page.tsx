import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import type { ResultView } from '@/lib/types';
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
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  let data: ApiOut;
  try {
    data = await api.get<ApiOut>(`/searches/${id}/results`, { cookie });
  } catch {
    notFound();
  }

  return <ResultsClient initial={data} />;
}
