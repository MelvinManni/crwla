'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type JobSearchView = {
  id: string;
  role: string;
  country: string | null;
  remote: boolean;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  metadata: unknown;
  resultCount?: number;
};

export type JobResultView = {
  id: string;
  companyId: string | null;
  companyName: string;
  title: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  salaryPeriod: string | null;
  url: string;
  description: string | null;
  relevanceScore: number;
  tags: string[];
  postedAt: number | null;
};

export type TrackedCompanyView = {
  id: string;
  name: string;
  careerUrl: string;
  selector: string | null;
  crawlIntervalMin: number;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  lastCrawled: number | null;
  lastError: string | null;
  jobCount: number;
  createdAt: number;
  updatedAt: number;
};

export const jsKeys = {
  list: () => ['job-search', 'list'] as const,
  results: (id: string) => ['job-search', 'results', id] as const,
  companies: (q?: string) => ['job-search', 'companies', q ?? ''] as const,
  meta: () => ['job-search', 'meta'] as const,
};

export type JobsMetaResponse = {
  hotTitles: string[];
  countries: Array<{ code: string; name: string; flag: string }>;
  stats: {
    trackedCompanies: number;
    averageCrawlCadenceMin: number;
    liveRoles: number;
  };
};

export function useJobsMeta() {
  return useQuery({
    queryKey: jsKeys.meta(),
    queryFn: () => api.get<JobsMetaResponse>('/job-search/meta'),
    staleTime: 5 * 60_000,
  });
}

export function useJobSearches() {
  return useQuery({
    queryKey: jsKeys.list(),
    queryFn: () => api.get<{ items: JobSearchView[] }>('/job-search'),
    staleTime: 30_000,
  });
}

export function useJobSearchResults(id: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: jsKeys.results(id),
    queryFn: () =>
      api.get<{ search: JobSearchView; results: JobResultView[] }>(`/job-search/${id}/results`),
    enabled: opts?.enabled ?? true,
    refetchInterval: (q) =>
      q.state.data?.search.status === 'COMPLETED' ||
      q.state.data?.search.status === 'ERROR'
        ? false
        : 2000,
  });
}

export function useCreateJobSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { role: string; country?: string; remote?: boolean }) =>
      api.post<{ search: JobSearchView }>('/job-search', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jsKeys.list() });
    },
  });
}

export function useDeleteJobSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/job-search/${id}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: jsKeys.list() });
      qc.removeQueries({ queryKey: jsKeys.results(id) });
    },
  });
}

export function useTrackedCompanies(q?: string) {
  return useQuery({
    queryKey: jsKeys.companies(q),
    queryFn: () =>
      api.get<{ items: TrackedCompanyView[] }>(
        q ? `/admin/tracked-companies?q=${encodeURIComponent(q)}` : '/admin/tracked-companies',
      ),
  });
}

export function useCreateTrackedCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      careerUrl: string;
      selector?: string;
      crawlIntervalMin?: number;
    }) => api.post<{ company: TrackedCompanyView }>('/admin/tracked-companies', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-search', 'companies'] }),
  });
}

export function useUpdateTrackedCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<TrackedCompanyView> & { active?: boolean }) =>
      api.patch<{ company: TrackedCompanyView }>(`/admin/tracked-companies/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-search', 'companies'] }),
  });
}

export function useDeleteTrackedCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/tracked-companies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-search', 'companies'] }),
  });
}
