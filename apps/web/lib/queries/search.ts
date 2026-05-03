'use client';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type SearchHit = {
  id: string;
  title: string;
  snippet: string | null;
  url: string;
  source: string;
  location: string | null;
  publishedAt: number | null;
  score: number | null;
  highlight?: string;
};

export type SearchResponse = { mode: 'es' | 'fts' | 'noop'; hits: SearchHit[] };

export type FulltextSearchInput = { q: string; source?: string; location?: string };

export function useFulltextSearch() {
  return useMutation({
    mutationFn: ({ q, source, location }: FulltextSearchInput) => {
      const params = new URLSearchParams({ q });
      if (source) params.set('source', source);
      if (location) params.set('location', location);
      return api.get<SearchResponse>(`/search?${params.toString()}`);
    },
  });
}
