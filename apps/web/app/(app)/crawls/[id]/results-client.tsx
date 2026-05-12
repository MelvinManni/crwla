'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeywordChip } from '@/components/keyword-chip';
import { StatusPill } from '@/components/status-pill';
import { ViewToggle, type ViewMode } from '@/components/view-toggle';
import { Pagination } from '@/components/pagination';
import { ListFilterBar, type ListFilters } from '@/components/list-filter-bar';
import { exportCsv, exportXls, type ExportColumn } from '@/lib/export';
import { buildListSearch, type ListParams } from '@/lib/list-state';
import { useQueryClient } from '@tanstack/react-query';
import {
  crawlResultsQuery,
  useApplyCrawlFilter,
  useRunCrawl,
} from '@/lib/queries/crawls';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { ResultView } from '@/lib/types';

type Initial = {
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
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

type SortKey = 'source' | 'title' | 'when';
type SortDir = 'asc' | 'desc';

const EXPORT_COLUMNS: ExportColumn<ResultView>[] = [
  { header: 'Source', value: (r) => r.source },
  { header: 'Title', value: (r) => r.title },
  { header: 'URL', value: (r) => r.url },
  { header: 'Snippet', value: (r) => r.snippet ?? '' },
  { header: 'Tag', value: (r) => r.tag ?? '' },
  { header: 'When', value: (r) => r.time ?? '' },
  {
    header: 'Published',
    value: (r) => (r.publishedAt ? new Date(r.publishedAt).toISOString() : ''),
  },
];

export function ResultsClient({
  initial,
  listParams,
}: {
  initial: Initial;
  listParams: ListParams;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const runMut = useRunCrawl();
  const filterMut = useApplyCrawlFilter();
  const [results, setResults] = useState(initial.results);
  const [filter, setFilter] = useState('');
  const [applied, setApplied] = useState(initial.job.filterPrompt || null);
  const [filterMode, setFilterMode] = useState<string | null>(null);
  // Reload spinner — separate from mutations.
  const [reloading, setReloading] = useState(false);

  const busy: 'run' | 'filter' | 'reload' | null = runMut.isPending
    ? 'run'
    : filterMut.isPending
      ? 'filter'
      : reloading
        ? 'reload'
        : null;

  async function fetchLatest() {
    // Route the refetch through the query cache so any consumer with the
    // same key receives the fresh data, and a future visit can hit the
    // cache instead of round-tripping.
    const out = await qc.fetchQuery(crawlResultsQuery(initial.job.id));
    setResults(out.results);
    qc.invalidateQueries({ queryKey: ['searches', 'results', initial.job.id] });
    router.refresh();
  }

  async function reload() {
    setReloading(true);
    try {
      await fetchLatest();
    } finally {
      setReloading(false);
    }
  }

  // One toast id for the whole click-through-fetch lifecycle so retries
  // don't stack.
  function runNow() {
    const t = toast.loading('Starting run…');
    runMut.mutate(initial.job.id, {
      onSuccess: async () => {
        toast.loading('Run started — fetching results…', { id: t });
        // Let the worker insert results before refetching.
        await new Promise((r) => setTimeout(r, 1500));
        await fetchLatest();
        toast.success('Results refreshed', { id: t });
      },
      onError: (e) => {
        const err = e as Error & { code?: string };
        if (err.code === 'RUN_IN_PROGRESS') {
          toast.warning('Run already in progress', {
            id: t,
            description: 'Wait for the current run to finish before starting another.',
          });
        } else {
          toast.error('Run failed', { id: t, description: err.message });
        }
      },
    });
  }

  function applyFilter() {
    if (!filter.trim()) return;
    filterMut.mutate(
      { id: initial.job.id, prompt: filter.trim() },
      {
        onSuccess: (out) => {
          setResults(out.results);
          setFilterMode(out.mode);
          setApplied(filter.trim());
          setFilter('');
        },
      },
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border bg-bg px-4 py-4 md:flex-row md:items-start md:justify-between md:gap-2 md:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href="/dashboard" />}
            className="h-9 w-9 rounded-lg border border-border bg-bg-elev"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-semibold tracking-[-0.01em]">
              {initial.job.name}
            </h1>
            <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
              {results.length} results · {initial.job.cron.toLowerCase()} · last run{' '}
              {initial.job.lastRun}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <StatusPill status={initial.job.status} />
          <Button
            variant="secondary"
            onClick={reload}
            disabled={busy !== null}
            loading={busy === 'reload'}
            className="rounded-lg"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="secondary"
            render={<Link href={`/crawls/${initial.job.id}/edit`} />}
            className="rounded-lg"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            onClick={runNow}
            disabled={busy !== null}
            loading={busy === 'run'}
            className="rounded-lg bg-fg text-bg-elev hover:bg-fg/90"
          >
            <Play className="h-3.5 w-3.5" />
            Run now
          </Button>
        </div>
      </div>

      {/* Keyword tag strip */}
      <div className="flex flex-wrap gap-1.5 border-b border-border bg-bg px-4 py-3 md:px-6">
        {initial.job.keywords.map((k) => (
          <KeywordChip key={k}>{k}</KeywordChip>
        ))}
      </div>

      {/* Filter prompt block */}
      <div className="px-4 pt-4 md:px-6">
        <div className="rounded-[10px] border border-border bg-bg-elev p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-fg-muted" />
            <span className="text-[12px] font-medium">Filter prompt</span>
            <span className="ml-auto font-mono text-[10px] text-fg-subtle">
              applied to {results.length} results
            </span>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Tell the model what to keep — e.g. only Series A or later, surface only North American companies, skip rumors."
              className="min-h-[60px] flex-1 rounded-lg bg-bg px-3 py-2.5 text-[13px]"
            />
            <Button
              onClick={applyFilter}
              disabled={busy !== null || !filter.trim()}
              loading={busy === 'filter'}
              className="rounded-lg bg-fg text-bg-elev hover:bg-fg/90"
            >
              <Sparkles className="h-3 w-3" />
              Apply
            </Button>
          </div>
          {applied && (
            <div className="mt-2.5 flex items-start gap-2 rounded-md bg-bg-sunk px-2.5 py-2 text-[12px]">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                Active
              </span>
              <span className="flex-1 text-fg">{applied}</span>
              <button
                onClick={() => setApplied(null)}
                className="shrink-0 font-mono text-[11px] text-fg-muted hover:text-fg"
              >
                clear
              </button>
            </div>
          )}
          {filterMode && (
            <p className="mt-2 font-mono text-[10px] text-fg-subtle">filter mode: {filterMode}</p>
          )}
        </div>
      </div>

      {/* Results panel */}
      <div className="flex-1 px-4 py-4 md:px-6">
        <ResultsPanel
          searchId={initial.job.id}
          results={results}
          total={initial.total}
          searchKeywords={initial.job.keywords}
          listParams={listParams}
        />
      </div>
    </div>
  );
}

function ResultsPanel({
  searchId,
  results,
  total,
  searchKeywords,
  listParams,
}: {
  searchId: string;
  results: ResultView[];
  total: number;
  searchKeywords: string[];
  listParams: ListParams;
}) {
  const router = useRouter();
  const base = `/crawls/${searchId}`;

  const [filters, setFilters] = useState<ListFilters>({
    query: listParams.q,
    keyword: listParams.keyword,
    time: listParams.time,
  });
  useEffect(() => {
    setFilters({
      query: listParams.q,
      keyword: listParams.keyword,
      time: listParams.time,
    });
  }, [listParams.q, listParams.keyword, listParams.time]);

  const [sortKey, setSortKey] = useState<SortKey>('when');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function pushFilters(next: ListFilters, debounceQuery: boolean) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const apply = () => {
      router.replace(
        buildListSearch(
          base,
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

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const out = [...results];
    out.sort((a, b) => {
      switch (sortKey) {
        case 'source':
          return a.source.localeCompare(b.source) * dir;
        case 'title':
          return a.title.localeCompare(b.title) * dir;
        case 'when':
        default: {
          const av = a.publishedAt ?? 0;
          const bv = b.publishedAt ?? 0;
          return (av - bv) * dir;
        }
      }
    });
    return out;
  }, [results, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'when' ? 'desc' : 'asc');
    }
  }

  function onView(next: ViewMode) {
    router.push(buildListSearch(base, { view: next, page: 1 }, listParams) as never);
  }
  function onPage(next: number) {
    router.push(buildListSearch(base, { page: next }, listParams) as never);
  }
  function onPageSize(next: number) {
    router.push(
      buildListSearch(base, { pageSize: next, page: 1 }, listParams) as never,
    );
  }
  function onExportCsv() {
    exportCsv('search-results', sorted, EXPORT_COLUMNS);
  }
  function onExportXls() {
    exportXls('search-results', sorted, EXPORT_COLUMNS);
  }

  const isFiltered =
    listParams.q !== '' || listParams.keyword !== '' || listParams.time !== 'all';

  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-bg-elev">
      <div className="sticky top-0 z-20 bg-bg-elev">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium">Results</span>
            <span className="font-mono text-[11px] text-fg-muted">
              {isFiltered ? `${total} matching` : `${total} items`}
            </span>
          </div>
          <ViewToggle value={listParams.view} onChange={onView} />
        </div>
        <ListFilterBar
          filters={filters}
          onFilters={onFilters}
          keywords={searchKeywords}
          pageSize={listParams.pageSize}
          onPageSize={onPageSize}
          onExportCsv={onExportCsv}
          onExportXls={onExportXls}
          searchPlaceholder="Search title, snippet or source…"
          keywordLabel="Matches"
          keywordAnyLabel="Any keyword"
          timeLabel="Published"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[13px] font-medium text-fg">
            {isFiltered ? 'No results match the current filters' : 'No results yet'}
          </p>
          <p className="mt-1 text-[12px] text-fg-muted">
            {isFiltered
              ? 'Try clearing a filter or widening the time window.'
              : 'Press Run now to fire a fresh crawl.'}
          </p>
        </div>
      ) : listParams.view === 'list' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Source"
                active={sortKey === 'source'}
                dir={sortDir}
                onClick={() => toggleSort('source')}
              />
              <SortableHead
                label="Title"
                active={sortKey === 'title'}
                dir={sortDir}
                onClick={() => toggleSort('title')}
              />
              <SortableHead
                label="When"
                active={sortKey === 'when'}
                dir={sortDir}
                onClick={() => toggleSort('when')}
                className="w-32"
              />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => window.open(r.url, '_blank', 'noreferrer')}
              >
                <TableCell className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted">
                  <div className="flex flex-col gap-1">
                    <span className="truncate">{r.source}</span>
                    {r.tag && (
                      <span className="self-start rounded-sm border border-border bg-bg-elev px-1 py-px font-mono text-[9px] normal-case text-fg">
                        {r.tag}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-1 text-[13px] font-medium">{r.title}</div>
                  {r.snippet && (
                    <div className="line-clamp-1 text-[12px] text-fg-muted">{r.snippet}</div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-fg-muted">
                  {r.time ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-fg-subtle" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col">
          {sorted.map((r) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3.5 border-b border-border bg-bg px-4 py-4 last:border-b-0 hover:bg-bg-elev"
            >
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image}
                  alt=""
                  className="h-[76px] w-[76px] shrink-0 rounded-md border border-border object-cover"
                />
              ) : (
                <div className="thumb-striped h-[76px] w-[76px] shrink-0 overflow-hidden rounded-md border border-border" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted">
                  <span className="truncate">{r.source}</span>
                  {r.tag && (
                    <span className="rounded-sm border border-border bg-bg-elev px-1 py-px text-fg">
                      {r.tag}
                    </span>
                  )}
                </div>
                <div className="line-clamp-2 text-[14px] font-medium leading-snug tracking-[-0.005em]">
                  {r.title}
                  <ExternalLink className="ml-1 inline h-3 w-3 text-fg-subtle" />
                </div>
                {r.snippet && (
                  <div className="line-clamp-2 text-[12px] leading-relaxed text-fg-muted">
                    {r.snippet}
                  </div>
                )}
                {r.time && (
                  <div className="mt-0.5 font-mono text-[10px] text-fg-subtle">{r.time}</div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <Pagination
        page={listParams.page}
        pageSize={listParams.pageSize}
        total={total}
        onChange={onPage}
      />
    </div>
  );
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead className={cn('select-none', className)}>
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
