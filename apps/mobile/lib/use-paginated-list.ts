import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/**
 * Infinite-scroll helper for FlatList:
 *   const { items, refresh, loadMore, refreshing, loadingMore } = usePaginatedList({
 *     path: '/searches',
 *     getItems: (data) => data.jobs,
 *   });
 *
 * `path` is the API path without page params. `getItems` extracts the array
 * (the API returns both the legacy key — `jobs`/`results`/`alerts` — and a
 * canonical `items` array; pass either).
 */
export function usePaginatedList<TItem, TRaw extends Partial<Page<TItem>> = Page<TItem>>(opts: {
  path: string;
  pageSize?: number;
  getItems: (data: TRaw) => TItem[] | undefined;
  enabled?: boolean;
}) {
  const { path, pageSize = 20, getItems, enabled = true } = opts;
  const [items, setItems] = useState<TItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single in-flight guard so onEndReached doesn't fire twice in a row.
  const inFlight = useRef(false);

  const fetchPage = useCallback(
    async (p: number, replace: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const sep = path.includes('?') ? '&' : '?';
        const data = await api.get<TRaw>(`${path}${sep}page=${p}&pageSize=${pageSize}`);
        const next = getItems(data) ?? [];
        setItems((prev) => (replace ? next : [...prev, ...next]));
        setPage(p);
        setHasMore(Boolean(data.hasMore));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        inFlight.current = false;
      }
    },
    [path, pageSize, getItems],
  );

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      await fetchPage(1, true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage, enabled]);

  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || refreshing || loadingMore || inFlight.current) return;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1, false);
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, hasMore, refreshing, loadingMore, fetchPage, page]);

  useEffect(() => {
    if (enabled) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled]);

  return { items, setItems, page, hasMore, refreshing, loadingMore, error, refresh, loadMore };
}
