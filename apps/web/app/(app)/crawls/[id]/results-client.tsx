'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  useToggleResultFavorite,
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

// Google's CDNs serve the news-carousel thumbnails and the
// `s2/favicons` proxy our scraper falls back to. We treat those as "no
// cover image" on the client so the row reaches for the article site's
// own favicon instead.
const GOOGLE_THUMB_HOSTS =
  /(^|\.)google\.com$|(^|\.)gstatic\.com$|(^|\.)googleusercontent\.com$/i;

function isGoogleThumb(url: string): boolean {
  try {
    return GOOGLE_THUMB_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function siteFavicon(articleUrl: string): string | null {
  try {
    return `https://icons.duckduckgo.com/ip3/${new URL(articleUrl).hostname}.ico`;
  } catch {
    return null;
  }
}

type Thumb =
  | { kind: 'cover'; src: string }
  | { kind: 'site'; src: string }
  | { kind: 'none' };

function pickThumbnail(r: ResultView): Thumb {
  if (r.image && !isGoogleThumb(r.image)) return { kind: 'cover', src: r.image };
  const fav = siteFavicon(r.url);
  return fav ? { kind: 'site', src: fav } : { kind: 'none' };
}

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
  favorite,
}: {
  initial: Initial;
  listParams: ListParams;
  favorite: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const runMut = useRunCrawl();
  const filterMut = useApplyCrawlFilter();
  const favoriteMut = useToggleResultFavorite();
  const [results, setResults] = useState(initial.results);
  // Header count must reflect the total stored results for this crawl, not
  // the loaded-page count or the active filter subset. We track it so a
  // run-now refresh updates the header.
  const [totalResults, setTotalResults] = useState(initial.total);
  const [filter, setFilter] = useState('');
  const [applied, setApplied] = useState(initial.job.filterPrompt || null);
  const [filterMode, setFilterMode] = useState<string | null>(null);
  // Reload spinner — separate from mutations.
  const [reloading, setReloading] = useState(false);

  /**
   * Optimistic favorite toggle. Updates local state immediately, fires the
   * mutation, and rolls back if the server rejects it. The favorites tab
   * filter (`?favorite=1`) is enforced server-side, so toggling on the
   * "All" tab keeps the row in place; toggling on "Favorites" makes the
   * row disappear after the next refetch — that's expected.
   */
  function toggleFavorite(resultId: string) {
    const before = results.find((r) => r.id === resultId)?.favorite ?? false;
    const next = !before;
    setResults((arr) =>
      arr.map((r) => (r.id === resultId ? { ...r, favorite: next } : r)),
    );
    favoriteMut.mutate(
      { searchId: initial.job.id, resultId, favorite: next },
      {
        onError: (e) => {
          setResults((arr) =>
            arr.map((r) => (r.id === resultId ? { ...r, favorite: before } : r)),
          );
          toast.error('Could not update favorite', {
            description: (e as Error).message,
          });
        },
      },
    );
  }

  function setTab(nextFavorite: boolean) {
    if (nextFavorite === favorite) return;
    const sp = new URLSearchParams();
    if (listParams.q) sp.set('q', listParams.q);
    if (listParams.keyword) sp.set('keyword', listParams.keyword);
    if (listParams.time !== 'all') sp.set('time', listParams.time);
    if (listParams.view !== 'list') sp.set('view', listParams.view);
    if (listParams.pageSize !== 20)
      sp.set('pageSize', String(listParams.pageSize));
    if (nextFavorite) sp.set('favorite', '1');
    const qs = sp.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as never);
  }

  // SSR re-runs whenever a URL param changes (page, pageSize, filters), but
  // because `results`/`totalResults` are useState-seeded from `initial`,
  // they only pick up the first SSR pass. Without this sync, changing the
  // page-size dropdown updates the URL + SSR fetch but the table keeps
  // rendering the original slice. Track the SSR-derived prop and replay
  // it into local state whenever the page/pageSize key changes.
  useEffect(() => {
    setResults(initial.results);
    setTotalResults(initial.total);
  }, [initial]);

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
    setTotalResults(out.total);
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
      <div
        id="crawl-header"
        className="flex flex-col gap-3 border-b border-border bg-bg px-4 py-4 md:flex-row md:items-start md:justify-between md:gap-2 md:px-6"
      >
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
              {totalResults} results · {initial.job.cron.toLowerCase()} · last run{' '}
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
            id="run-now-btn"
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
      <div
        id="crawl-keywords"
        className="flex flex-wrap gap-1.5 border-b border-border bg-bg px-4 py-3 md:px-6"
      >
        {initial.job.keywords.map((k) => (
          <KeywordChip key={k}>{k}</KeywordChip>
        ))}
      </div>

      {/* Filter prompt block */}
      <div className="px-4 pt-4 md:px-6">
        <div id="filter-prompt" className="rounded-[10px] border border-border bg-bg-elev p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-fg-muted" />
            <span className="text-[12px] font-medium">Filter prompt</span>
            <span className="ml-auto font-mono text-[10px] text-fg-subtle">
              applied to {results.length} results
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
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
              className="rounded-lg bg-fg text-bg-elev hover:bg-fg/90 sm:self-start"
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
      <div id="results-pane" className="flex-1 px-4 py-4 md:px-6">
        <ResultsPanel
          searchId={initial.job.id}
          results={results}
          total={initial.total}
          searchKeywords={initial.job.keywords}
          listParams={listParams}
          favorite={favorite}
          onSetTab={setTab}
          onToggleFavorite={toggleFavorite}
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
  favorite,
  onSetTab,
  onToggleFavorite,
}: {
  searchId: string;
  results: ResultView[];
  total: number;
  searchKeywords: string[];
  listParams: ListParams;
  favorite: boolean;
  onSetTab: (nextFavorite: boolean) => void;
  onToggleFavorite: (resultId: string) => void;
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

  // Sort dropdown in the filter header replaces the old sortable table
  // columns. Value is a `<key>-<dir>` slug so the dropdown shows one
  // option per natural reading order (e.g. "Newest first").
  type Sort =
    | 'when-desc'
    | 'when-asc'
    | 'source-asc'
    | 'source-desc'
    | 'title-asc'
    | 'title-desc';
  const SORT_OPTIONS: { value: Sort; label: string }[] = [
    { value: 'when-desc', label: 'Newest first' },
    { value: 'when-asc', label: 'Oldest first' },
    { value: 'source-asc', label: 'Source A–Z' },
    { value: 'source-desc', label: 'Source Z–A' },
    { value: 'title-asc', label: 'Title A–Z' },
    { value: 'title-desc', label: 'Title Z–A' },
  ];
  const [sort, setSort] = useState<Sort>('when-desc');

  const sorted = useMemo(() => {
    const out = [...results];
    out.sort((a, b) => {
      switch (sort) {
        case 'when-desc':
          return (b.publishedAt ?? 0) - (a.publishedAt ?? 0);
        case 'when-asc':
          return (a.publishedAt ?? 0) - (b.publishedAt ?? 0);
        case 'source-asc':
          return a.source.localeCompare(b.source);
        case 'source-desc':
          return b.source.localeCompare(a.source);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
      }
    });
    return out;
  }, [results, sort]);

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
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium">Results</span>
            <span className="font-mono text-[11px] text-fg-muted">
              {isFiltered ? `${total} matching` : `${total} items`}
            </span>
          </div>
          {/* All / Favorites pill tabs. Active pill takes the brand
              accent so the user can tell what they're filtering on
              without reading copy. */}
          <div
            role="tablist"
            aria-label="Result filter"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-bg-elev p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!favorite}
              onClick={() => onSetTab(false)}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                !favorite
                  ? 'bg-accent text-accent-foreground'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={favorite}
              onClick={() => onSetTab(true)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                favorite
                  ? 'bg-accent text-accent-foreground'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              <Heart
                className={cn(
                  'h-3.5 w-3.5',
                  favorite ? 'fill-current' : 'fill-transparent',
                )}
              />
              Favorites
            </button>
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
          sort={sort}
          sortOptions={SORT_OPTIONS}
          onSort={(v) => setSort(v as Sort)}
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
        <ul className="divide-y divide-border">
          {sorted.map((r) => (
            <li
              key={r.id}
              className="group relative flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-bg-elev"
            >
              {/* Stretched-link target so the row is clickable but the
                  heart button (a real button, can't nest inside <a>) sits
                  as a sibling on top. */}
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                aria-label={r.title}
                className="absolute inset-0 z-0"
              />
              <ResultThumb r={r} />
              <div className="relative z-10 pointer-events-none flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted">
                  <span className="truncate">{r.source}</span>
                  {r.tag && (
                    <span className="rounded-sm border border-border bg-bg-elev px-1 py-px text-fg">
                      {r.tag}
                    </span>
                  )}
                </div>
                <div className="line-clamp-2 text-[14px] font-medium leading-snug tracking-[-0.005em] group-hover:text-fg">
                  {r.title}
                </div>
                {r.snippet && (
                  <div className="line-clamp-2 text-[12px] leading-relaxed text-fg-muted">
                    {r.snippet}
                  </div>
                )}
                {r.time && (
                  <div className="mt-0.5 font-mono text-[10px] text-fg-subtle">
                    {r.time}
                  </div>
                )}
              </div>
              <FavoriteToggle
                active={r.favorite}
                onToggle={() => onToggleFavorite(r.id)}
              />
              <ExternalLink className="relative z-10 pointer-events-none mt-1 h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((r) => (
            <div
              key={r.id}
              className="group relative flex flex-col overflow-hidden rounded-[10px] border border-border bg-bg-elev transition-colors hover:border-border-strong"
            >
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                aria-label={r.title}
                className="absolute inset-0 z-0"
              />
              <ResultThumbWide r={r} />
              <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col gap-1.5 p-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted">
                  <span className="truncate">{r.source}</span>
                  {r.tag && (
                    <span className="rounded-sm border border-border bg-bg px-1 py-px text-fg">
                      {r.tag}
                    </span>
                  )}
                </div>
                <div className="line-clamp-3 text-[14px] font-medium leading-snug tracking-[-0.005em] group-hover:text-fg">
                  {r.title}
                  <ExternalLink className="ml-1 inline h-3 w-3 text-fg-subtle" />
                </div>
                {r.snippet && (
                  <div className="line-clamp-2 text-[12px] leading-relaxed text-fg-muted">
                    {r.snippet}
                  </div>
                )}
                {r.time && (
                  <div className="mt-auto pt-1 font-mono text-[10px] text-fg-subtle">
                    {r.time}
                  </div>
                )}
              </div>
              <div className="absolute right-2 top-2 z-20">
                <FavoriteToggle
                  active={r.favorite}
                  onToggle={() => onToggleFavorite(r.id)}
                />
              </div>
            </div>
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

/**
 * Heart button shared by the list rows and grid cards. Sits above the
 * stretched-link click target via z-index and stops propagation so a
 * click doesn't navigate into the article URL.
 */
function FavoriteToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        'relative z-20 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors',
        active
          ? 'text-accent'
          : 'text-fg-subtle hover:bg-bg-sunk hover:text-accent',
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          active ? 'fill-accent' : 'fill-transparent',
        )}
      />
    </button>
  );
}

function ResultThumb({ r }: { r: ResultView }) {
  // Start from the best candidate, downgrade on image-load errors.
  const initial = pickThumbnail(r);
  const [thumb, setThumb] = useState<Thumb>(initial);

  if (thumb.kind === 'none') {
    return (
      <div className="thumb-striped h-[76px] w-[76px] shrink-0 overflow-hidden rounded-md border border-border" />
    );
  }

  const isSite = thumb.kind === 'site';
  return (
    <div
      className={cn(
        'grid h-[76px] w-[76px] shrink-0 overflow-hidden rounded-md border border-border',
        isSite ? 'place-items-center bg-bg-sunk' : '',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb.src}
        alt=""
        className={cn(isSite ? 'h-9 w-9 object-contain' : 'h-full w-full object-cover')}
        onError={() => {
          // Cover failed → try the site favicon. Site favicon failed → striped.
          if (thumb.kind === 'cover') {
            const fav = siteFavicon(r.url);
            setThumb(fav ? { kind: 'site', src: fav } : { kind: 'none' });
          } else {
            setThumb({ kind: 'none' });
          }
        }}
      />
    </div>
  );
}

/**
 * Wide thumbnail used for grid cards. Same downgrade chain as
 * {@link ResultThumb} but fills the card width at a fixed aspect ratio
 * (16:9-ish) instead of a 76×76 square — matches typical news/article
 * card layouts.
 */
function ResultThumbWide({ r }: { r: ResultView }) {
  const initial = pickThumbnail(r);
  const [thumb, setThumb] = useState<Thumb>(initial);

  if (thumb.kind === 'none') {
    return (
      <div className="thumb-striped aspect-[16/9] w-full border-b border-border" />
    );
  }

  const isSite = thumb.kind === 'site';
  return (
    <div
      className={cn(
        'aspect-[16/9] w-full overflow-hidden border-b border-border',
        isSite ? 'grid place-items-center bg-bg-sunk' : 'bg-bg-sunk',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb.src}
        alt=""
        className={cn(isSite ? 'h-12 w-12 object-contain' : 'h-full w-full object-cover')}
        onError={() => {
          if (thumb.kind === 'cover') {
            const fav = siteFavicon(r.url);
            setThumb(fav ? { kind: 'site', src: fav } : { kind: 'none' });
          } else {
            setThumb({ kind: 'none' });
          }
        }}
      />
    </div>
  );
}
