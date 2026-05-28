'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PricingSearchView = {
  id: string;
  productName: string;
  intent: string;
  country: string | null;
  category: string | null;
  currency: string;
  maxPriceUsd: number | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  alternatives: Array<{
    title: string;
    priceUsd: number;
    url: string;
    imageUrl: string | null;
    storeName: string;
    save: string;
  }>;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  metadata: unknown;
  resultCount?: number;
};

export type PricingResultView = {
  id: string;
  storeName: string;
  source: string;
  title: string;
  priceUsd: number;
  priceNative: number | null;
  currencyNative: string | null;
  url: string;
  imageUrl: string | null;
  youtubeUrl: string | null;
  reviewSummary: string | null;
  rating: number | null;
  reviewCount: number;
  trustScore: number;
  rankScore: number;
  percentile: number;
  dealBadge: string | null;
  intentMatch: string;
};

export type PricingDetailResponse = {
  result: PricingResultView & { intentReason: string | null };
  reviews: Array<{
    id: string;
    author: string;
    rating: number;
    body: string;
    postedAt: number | null;
  }>;
  search: PricingSearchView;
};

export type CreatePricingSearchInput = {
  productName: string;
  country?: string;
  category?: string;
  currency?: string;
  maxPriceUsd?: number;
};

export const pcKeys = {
  list: () => ['pricing-crawla', 'list'] as const,
  results: (id: string) => ['pricing-crawla', 'results', id] as const,
  detail: (id: string) => ['pricing-crawla', 'detail', id] as const,
  rates: () => ['pricing-crawla', 'rates'] as const,
  meta: () => ['pricing-crawla', 'meta'] as const,
};

export type PricingMetaResponse = {
  trending: Array<{ q: string; hot?: boolean; count: number }>;
  countries: Array<{ code: string; name: string; flag: string }>;
  categories: string[];
  currencies: ReadonlyArray<string>;
  stats: {
    retailers: number;
    reviewsIndexed: number;
    resultsTracked: number;
  };
};

export function usePricingMeta() {
  return useQuery({
    queryKey: pcKeys.meta(),
    queryFn: () => api.get<PricingMetaResponse>('/pricing-crawla/meta'),
    staleTime: 5 * 60_000,
  });
}

export function usePricingSearches() {
  return useQuery({
    queryKey: pcKeys.list(),
    queryFn: () => api.get<{ items: PricingSearchView[] }>('/pricing-crawla/searches'),
    staleTime: 30_000,
  });
}

export function usePricingResults(searchId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: pcKeys.results(searchId),
    queryFn: () =>
      api.get<{ search: PricingSearchView; results: PricingResultView[] }>(
        `/pricing-crawla/${searchId}/results`,
      ),
    enabled: opts?.enabled ?? true,
    refetchInterval: (q) =>
      q.state.data?.search.status === 'COMPLETED' ||
      q.state.data?.search.status === 'ERROR'
        ? false
        : 2000,
  });
}

export function usePricingDetail(resultId: string | null) {
  return useQuery({
    queryKey: pcKeys.detail(resultId ?? 'none'),
    queryFn: () =>
      api.get<PricingDetailResponse>(`/pricing-crawla/result/${resultId}/details`),
    enabled: !!resultId,
  });
}

export function useFxRates() {
  return useQuery({
    queryKey: pcKeys.rates(),
    queryFn: () => api.get<{ rates: Record<string, number> }>('/pricing-crawla/rates'),
    staleTime: 5 * 60_000,
  });
}

export function useCreatePricingSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePricingSearchInput) =>
      api.post<{ search: PricingSearchView }>('/pricing-crawla/search', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pcKeys.list() });
    },
  });
}

export function useDeletePricingSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/pricing-crawla/${id}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: pcKeys.list() });
      qc.removeQueries({ queryKey: pcKeys.results(id) });
    },
  });
}
