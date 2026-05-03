'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListParams } from '@/lib/list-state';
import type { SearchView } from '@/lib/types';
import { qk } from './keys';

export type SearchesListResponse = { jobs: SearchView[] };

export function useSearchesList(
  params: ListParams,
  opts?: { initialData?: SearchesListResponse },
) {
  return useQuery({
    queryKey: qk.searches.list(params),
    queryFn: () => api.get<SearchesListResponse>('/searches'),
    initialData: opts?.initialData,
  });
}
