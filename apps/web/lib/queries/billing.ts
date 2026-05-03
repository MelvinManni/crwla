'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { qk } from './keys';
import type { Entitlements } from '@/components/billing/entitlements-provider';

export function useEntitlementsQuery(opts?: { initialData?: Entitlements }) {
  const setEntitlements = useStore((s) => s.setEntitlements);
  const query = useQuery({
    queryKey: qk.billing.me(),
    queryFn: () => api.get<Entitlements>('/billing/me'),
    initialData: opts?.initialData,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (query.data) setEntitlements(query.data);
  }, [query.data, setEntitlements]);
  return query;
}
