'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from './keys';
import type { ListParams } from '@/lib/list-state';
import type { AlertView } from '@/app/(app)/alerts/page';

export type AlertsListResponse = {
  alerts: AlertView[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function useAlerts(
  params: ListParams,
  opts?: { initialData?: AlertsListResponse },
) {
  return useQuery({
    queryKey: qk.alerts.list(params),
    queryFn: () =>
      api.get<AlertsListResponse>(`/alerts?page=${params.page}&pageSize=${params.pageSize}`),
    initialData: opts?.initialData,
    staleTime: 30_000,
  });
}

export type CreateAlertInput = {
  keyword: string;
  frequency: 'REALTIME' | 'HOURLY' | 'DAILY';
};

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAlertInput) => api.post<AlertView>('/alerts', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; active?: boolean }) =>
      api.patch<AlertView>(`/alerts/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/alerts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
