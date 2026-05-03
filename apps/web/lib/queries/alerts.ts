'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListParams } from '@/lib/list-state';
import type { AlertFrequency, AlertView } from '@/lib/types';
import { qk } from './keys';

export type AlertsListResponse = { alerts: AlertView[] };

export type CreateAlertInput = {
  keyword: string;
  searchId?: string | null;
  sources?: string[];
  locations?: string[];
  frequency?: AlertFrequency;
};

export type PatchAlertInput = {
  active?: boolean;
  frequency?: AlertFrequency;
};

export function useAlertsList(params: ListParams, opts?: { initialData?: AlertsListResponse }) {
  return useQuery({
    queryKey: qk.alerts.list(params),
    queryFn: () => api.get<AlertsListResponse>('/alerts'),
    initialData: opts?.initialData,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAlertInput) => api.post<AlertView>('/alerts', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts', 'list'] });
    },
  });
}

export function useToggleAlert(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatchAlertInput) => api.patch<AlertView>(`/alerts/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts', 'list'] });
    },
  });
}

export function useDeleteAlert(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<void>(`/alerts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts', 'list'] });
    },
  });
}
