'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SourcesResponse } from '@/lib/types';
import { qk } from './keys';

export function useSourcesQuery() {
  return useQuery({
    queryKey: qk.searches.sources(),
    queryFn: () => api.get<SourcesResponse>('/sources'),
    staleTime: 5 * 60_000,
  });
}
