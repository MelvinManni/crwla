'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ViewToggle, type ViewMode } from '@/components/view-toggle';
import { Pagination } from '@/components/pagination';
import { KeywordChip } from '@/components/keyword-chip';
import { StatusPill } from '@/components/status-pill';
import { SearchCard } from '@/components/search-card';
import { ListFilterBar, type ListFilters } from '@/components/list-filter-bar';
import { buildListSearch, type ListParams } from '@/lib/list-state';
import { exportCsv, exportXls, type ExportColumn } from '@/lib/export';
import { cn } from '@/lib/utils';
import { useCrawls, type CrawlsListResponse } from '@/lib/queries/crawls';
import type { SearchView } from '@/lib/types';

type SortKey = 'name' | 'lastRun' | 'results' | 'status';
type SortDir = 'asc' | 'desc';

const EXPORT_COLUMNS: ExportColumn<SearchView>[] = [
  { header: 'Name', value: (s) => s.name },
  { header: 'Keywords', value: (s) => s.keywords.join('; ') },
  { header: 'Schedule', value: (s) => s.cronLabel },
  { header: 'Status', value: (s) => s.status },
  { header: 'Last run', value: (s) => s.lastRun },
  { header: 'Next run', value: (s) => s.nextRun },
  { header: 'Results', value: (s) => s.results },
  {
    header: 'Saved',
    value: (s) => new Date(s.createdAt).toISOString(),
  },
];

export function DashboardClient({
  initialData,
  listParams,
}: {
  initialData: CrawlsListResponse;
  listParams: ListParams;
}) {
  const router = useRouter();
  const { page, pageSize, view } = listParams;
  // SSR fetched the data already — seed the query cache so subsequent
  // mutations (start crawl, delete crawl) can invalidate this key and
  // trigger a fresh fetch without a full page reload.
  const { data } = useCrawls(listParams, { initialData });
  const jobs = data?.jobs ?? initialData.jobs;
  const total = data?.total ?? initialData.total;

  // Filter state mirrors the URL but the query input is debounced — typing
  // shouldn't trigger a server fetch on every keystroke.
  const [filters, setFilters] = useState<ListFilters>({
    query: listParams.q,
    keyword: listParams.keyword,
    time: listParams.time,
  });
  // Re-sync local state when the URL changes from outside (back/forward nav).
  useEffect(() => {
    setFilters({
      query: listParams.q,
      keyword: listParams.keyword,
      time: listParams.time,
    });
  }, [listParams.q, listParams.keyword, listParams.time]);

  const [sortKey, setSortKey] = useState<SortKey>('lastRun');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Debounce only the free-text query so dropdown changes still apply
  // immediately. Other dimensions push to URL on every change.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function pushFilters(next: ListFilters, debounceQuery: boolean) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const apply = () => {
      router.replace(
        buildListSearch(
          '/dashboard',
          { q: next.query, keyword: next.keyword, time: next.time, page: 1 },
          listParams,
        ) as never,
      );
    };
    if (debounceQuery) debounceRef.current = setTimeout(apply, 300);
    else apply();
  }

  function onFilters(next: ListFilters) {
    const queryChanged = next.query !== filters.query;
    const otherChanged =
      next.keyword !== filters.keyword || next.time !== filters.time;
    setFilters(next);
    if (otherChanged) pushFilters(next, false);
    else if (queryChanged) pushFilters(next, true);
  }

  const allKeywords = useMemo(() => {
    const set = new Set<string>();
    for (const s of jobs) for (const k of s.keywords) set.add(k);
    if (filters.keyword) set.add(filters.keyword);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jobs, filters.keyword]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const out = [...jobs];
    out.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'results':
          return (a.results - b.results) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'lastRun':
        default:
          return (a.createdAt - b.createdAt) * dir;
      }
    });
    return out;
  }, [jobs, sortKey, sortDir]);

  function setView(next: ViewMode) {
    router.push(
      buildListSearch('/dashboard', { view: next, page: 1 }, listParams) as never,
    );
  }
  function setPage(next: number) {
    router.push(
      buildListSearch('/dashboard', { page: next }, listParams) as never,
    );
  }
  function setPageSize(next: number) {
    router.push(
      buildListSearch(
        '/dashboard',
        { pageSize: next, page: 1 },
        listParams,
      ) as never,
    );
  }
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  function onExportCsv() {
    exportCsv('crawls', sorted, EXPORT_COLUMNS);
  }
  function onExportXls() {
    exportXls('crawls', sorted, EXPORT_COLUMNS);
  }

  const isFiltered =
    listParams.q !== '' || listParams.keyword !== '' || listParams.time !== 'all';

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] text-fg-subtle">
          {total} {isFiltered ? 'MATCHING' : 'TOTAL'} · PAGE {page} · {pageSize}/PAGE
        </span>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === 'list' ? (
        <div className="overflow-hidden rounded-[10px] border border-border bg-bg-elev">
          <ListFilterBar
            filters={filters}
            onFilters={onFilters}
            keywords={allKeywords}
            pageSize={pageSize}
            onPageSize={setPageSize}
            onExportCsv={onExportCsv}
            onExportXls={onExportXls}
            className="sticky top-0 z-20"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Name"
                  active={sortKey === 'name'}
                  dir={sortDir}
                  onClick={() => toggleSort('name')}
                />
                <TableHead>Keywords</TableHead>
                <TableHead>Schedule</TableHead>
                <SortableHead
                  label="Last run"
                  active={sortKey === 'lastRun'}
                  dir={sortDir}
                  onClick={() => toggleSort('lastRun')}
                />
                <SortableHead
                  label="Status"
                  active={sortKey === 'status'}
                  dir={sortDir}
                  onClick={() => toggleSort('status')}
                />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="px-4 py-10 text-center text-[13px] text-fg-muted"
                  >
                    {isFiltered
                      ? 'No crawls match the current filters.'
                      : 'No crawls yet — start your first to begin tracking keywords.'}
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((j) => (
                  <TableRow
                    key={j.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/crawls/${j.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{j.name}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                        {j.results} results
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {j.keywords.slice(0, 2).map((k) => (
                          <KeywordChip key={k} muted>
                            {k}
                          </KeywordChip>
                        ))}
                        {j.keywords.length > 2 && (
                          <span className="self-center font-mono text-[11px] text-fg-subtle">
                            +{j.keywords.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-fg-muted">
                      {j.cronLabel}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-fg-muted">
                      {j.lastRun}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={j.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-fg-subtle" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onChange={setPage}
          />
        </div>
      ) : (
        <>
          <div className="mb-3 overflow-hidden rounded-[10px] border border-border bg-bg-elev">
            <ListFilterBar
              filters={filters}
              onFilters={onFilters}
              keywords={allKeywords}
              pageSize={pageSize}
              onPageSize={setPageSize}
              onExportCsv={onExportCsv}
              onExportXls={onExportXls}
              className="sticky top-0 z-20"
            />
          </div>
          {sorted.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border bg-bg-elev px-6 py-16 text-center text-[13px] text-fg-muted">
              {isFiltered
                ? 'No crawls match the current filters.'
                : 'No crawls yet — start your first to begin tracking keywords.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((j) => (
                <SearchCard key={j.id} search={j} />
              ))}
            </div>
          )}
          <div className="mt-4 overflow-hidden rounded-[10px] border border-border bg-bg-elev">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onChange={setPage}
              className="border-t-0"
            />
          </div>
        </>
      )}
    </>
  );
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <TableHead className="select-none">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] hover:text-fg',
          active ? 'text-fg' : 'text-fg-subtle',
        )}
      >
        {label}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}
