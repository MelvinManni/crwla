import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { DashboardClient } from './dashboard-client';
import type { SearchesListResponse } from '@/lib/queries/searches';

export default async function DashboardPage() {
  const user = await requireSession();
  const jar = await cookies();
  const cookie = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  const initialData = await api.get<SearchesListResponse>('/searches', { cookie });

  return <DashboardClient email={user.email} initialData={initialData} />;
}
