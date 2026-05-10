import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { parseListParams } from '@/lib/list-state';
import { AlertsClient } from './alerts-client';

export type AlertView = {
  id: string;
  keyword: string;
  sources: string[];
  locations: string[];
  frequency: 'REALTIME' | 'HOURLY' | 'DAILY';
  active: boolean;
  lastTriggered: string | null;
  createdAt: string;
  searchId: string | null;
};

type ApiOut = {
  alerts: AlertView[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const sp = await searchParams;
  const list = parseListParams(sp, { pageSize: 20, view: 'list' });

  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  const out = await api.get<ApiOut>(
    `/alerts?page=${list.page}&pageSize=${list.pageSize}`,
    { cookie },
  );

  return (
    <AlertsClient
      initialAlerts={out.alerts}
      total={out.total}
      listParams={list}
    />
  );
}
