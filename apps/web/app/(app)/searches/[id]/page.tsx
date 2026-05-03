import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import type { SearchResultsResponse } from '@/lib/queries/searches';
import { ResultsClient } from './results-client';

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  let data: SearchResultsResponse;
  try {
    data = await api.get<SearchResultsResponse>(`/searches/${id}/results`, { cookie });
  } catch {
    notFound();
  }

  return <ResultsClient id={id} initialData={data} />;
}
