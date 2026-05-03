import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import type { AlertView } from '@/lib/types';
import { AlertsClient } from './alerts-client';

export default async function AlertsPage() {
  await requireSession();
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  const out = await api.get<{ alerts: AlertView[] }>('/alerts', { cookie });

  return <AlertsClient initialData={{ alerts: out.alerts }} />;
}
