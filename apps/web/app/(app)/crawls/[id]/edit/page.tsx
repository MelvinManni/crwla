import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import type { SearchView } from '@/lib/types';
import { EditSearchClient } from './edit-client';

export default async function EditSearchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  let job: SearchView;
  try {
    const out = await api.get<{ job: SearchView }>(`/searches/${id}`, { cookie });
    job = out.job;
  } catch {
    notFound();
  }
  return <EditSearchClient initial={job} />;
}
