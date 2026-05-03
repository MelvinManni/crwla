'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SearchView } from '@/lib/types';
import { qk } from './keys';

export type CreateSearchInput = {
  name: string;
  keywords: string[];
  cron: string;
  filterPrompt?: string;
  sources: string[];
};

export type UpdateSearchInput = Partial<CreateSearchInput> & { status?: string };

export function useCreateSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSearchInput) => api.post<{ job: SearchView }>('/searches', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['searches', 'list'] });
    },
  });
}

export function useUpdateSearch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSearchInput) =>
      api.patch<{ job: SearchView }>(`/searches/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['searches', 'list'] });
      qc.invalidateQueries({ queryKey: qk.searches.detail(id) });
    },
  });
}

export function useDeleteSearch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<void>(`/searches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['searches', 'list'] });
    },
  });
}

export function useSearchDetail(id: string, opts?: { initialData?: { job: SearchView } }) {
  return useQuery({
    queryKey: qk.searches.detail(id),
    queryFn: () => api.get<{ job: SearchView }>(`/searches/${id}`),
    initialData: opts?.initialData,
  });
}
