'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListParams } from '@/lib/list-state';
import type { ResultView } from '@/lib/types';
import { qk } from './keys';

export type SearchResultsResponse = {
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

export function useSearchResults(
  id: string,
  params: ListParams,
  opts?: { initialData?: SearchResultsResponse },
) {
  return useQuery({
    queryKey: qk.searches.results(id, params),
    queryFn: () => api.get<SearchResultsResponse>(`/searches/${id}/results`),
    initialData: opts?.initialData,
  });
}

export function useRunSearch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>(`/searches/${id}/run`),
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['searches', 'results', id] });
        qc.invalidateQueries({ queryKey: qk.searches.detail(id) });
      }, 1500);
    },
  });
}

export function useFilterResults(id: string) {
  return useMutation({
    mutationFn: (prompt: string) =>
      api.post<{ results: ResultView[]; mode: string }>(`/searches/${id}/filter`, { prompt }),
  });
}
