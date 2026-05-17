'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from './keys';
import type { ListParams } from '@/lib/list-state';
import type { CronPreset, ResultView, SearchView } from '@/lib/types';

export type CrawlsListResponse = {
  jobs: SearchView[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function buildListQs(p: ListParams): string {
  const qs = new URLSearchParams();
  qs.set('page', String(p.page));
  qs.set('pageSize', String(p.pageSize));
  if (p.q) qs.set('q', p.q);
  if (p.keyword) qs.set('keyword', p.keyword);
  if (p.time !== 'all') qs.set('time', p.time);
  return qs.toString();
}

export function useCrawls(
  params: ListParams,
  opts?: { initialData?: CrawlsListResponse },
) {
  return useQuery({
    queryKey: qk.searches.list(params),
    queryFn: () => api.get<CrawlsListResponse>(`/searches?${buildListQs(params)}`),
    initialData: opts?.initialData,
    staleTime: 30_000,
  });
}

export type CreateCrawlInput = {
  name: string;
  keywords: string[];
  cron: CronPreset;
  filterPrompt?: string;
  strict?: boolean;
};

export function useCreateCrawl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCrawlInput) =>
      api.post<{ job: SearchView }>('/searches', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['searches'] });
      qc.invalidateQueries({ queryKey: ['searches', 'next-name'] });
      // The server upserts the FIRST_CRAWL onboarding row when a non-admin
      // creates their first crawl. Refetch so the walkthrough picks it up
      // on the next route render (typically /crawls/[id]).
      qc.invalidateQueries({ queryKey: qk.onboarding.active() });
    },
  });
}

/**
 * Preview the auto-name a blank-name create would land on. Used by the
 * Start-Crawl dialog as the name-field placeholder so users see what they'll
 * get if they don't type one. `enabled` lets the consumer fetch only while
 * the dialog is open.
 */
export function useNextCrawlName(enabled = true) {
  return useQuery({
    queryKey: ['searches', 'next-name'] as const,
    queryFn: () => api.get<{ name: string }>('/searches/next-name'),
    enabled,
    staleTime: 30_000,
  });
}

export type UpdateCrawlInput = {
  id: string;
  name?: string;
  keywords?: string[];
  cron?: CronPreset;
  filterPrompt?: string;
  strict?: boolean;
  status?: 'RUNNING' | 'PAUSED';
  publicAccess?: boolean;
};

export function useUpdateCrawl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCrawlInput) =>
      api.patch<{ job: SearchView }>(`/searches/${id}`, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['searches'] });
      qc.invalidateQueries({ queryKey: qk.searches.detail(vars.id) });
    },
  });
}

export function useDeleteCrawl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/searches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['searches'] });
    },
  });
}

export function useEnableCrawlShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<SearchView>(`/searches/${id}/share`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.searches.detail(id) });
      qc.invalidateQueries({ queryKey: ['searches'] });
    },
  });
}

export function useDisableCrawlShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<SearchView>(`/searches/${id}/share`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.searches.detail(id) });
      qc.invalidateQueries({ queryKey: ['searches'] });
    },
  });
}

export function useRunCrawl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/searches/${id}/run`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.searches.detail(id) });
      qc.invalidateQueries({ queryKey: ['searches', 'results', id] });
    },
  });
}

export function useApplyCrawlFilter() {
  return useMutation({
    mutationFn: ({ id, prompt }: { id: string; prompt: string }) =>
      api.post<{ results: ResultView[]; mode: string }>(
        `/searches/${id}/filter`,
        { prompt },
      ),
  });
}

/**
 * Toggle a single result's favorite flag. Returns the new state from the
 * server so callers can reconcile optimistic updates without re-fetching.
 */
export function useToggleResultFavorite() {
  return useMutation({
    mutationFn: ({
      searchId,
      resultId,
      favorite,
    }: {
      searchId: string;
      resultId: string;
      favorite: boolean;
    }) =>
      api.patch<{ id: string; favorite: boolean }>(
        `/searches/${searchId}/results/${resultId}/favorite`,
        { favorite },
      ),
  });
}

export type CrawlResultsResponse = {
  job: {
    id: string;
    name: string;
    cron: string;
    filterPrompt: string;
    strict: boolean;
    status: string;
    keywords: string[];
    lastRun: string;
  };
  results: ResultView[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/**
 * Shared options for `qc.fetchQuery` / `useQuery` consumers that want the
 * latest results for a crawl. Keeps the key + fetcher in one place so
 * imperative refetches and declarative reads agree.
 */
export function crawlResultsQuery(id: string) {
  return {
    queryKey: ['searches', 'results', id, 'live'] as const,
    queryFn: () => api.get<CrawlResultsResponse>(`/searches/${id}/results`),
  };
}
