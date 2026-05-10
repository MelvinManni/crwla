'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ExternalLink, Pencil, Play, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeywordChip } from '@/components/keyword-chip';
import { StatusPill } from '@/components/status-pill';
import { ViewToggle, type ViewMode } from '@/components/view-toggle';
import { Pagination } from '@/components/pagination';
import { buildListSearch, type ListParams } from '@/lib/list-state';
import { api } from '@/lib/api';
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

export function ResultsClient({
  initial,
  listParams,
}: {
  initial: Initial;
  listParams: ListParams;
}) {
  const router = useRouter();
  const [results, setResults] = useState(initial.results);
  const [filter, setFilter] = useState('');
  const [applied, setApplied] = useState(initial.job.filterPrompt || null);
  const [filterMode, setFilterMode] = useState<string | null>(null);
  const [busy, setBusy] = useState<'run' | 'filter' | 'reload' | null>(null);

  async function reload() {
    setBusy('reload');
    try {
      const out = await api.get<Initial>(`/searches/${initial.job.id}/results`);
      setResults(out.results);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function runNow() {
    setBusy('run');
    try {
      await api.post(`/searches/${initial.job.id}/run`);
      setTimeout(reload, 1500);
    } finally {
      setBusy(null);
    }
  }

  async function applyFilter() {
    if (!filter.trim()) return;
    setBusy('filter');
    try {
      const out = await api.post<{ results: ResultView[]; mode: string }>(
        `/searches/${initial.job.id}/filter`,
        { prompt: filter.trim() },
      );
      setResults(out.results);
      setFilterMode(out.mode);
      setApplied(filter.trim());
      setFilter('');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border bg-bg px-4 py-4 md:px-6">
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
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={initial.job.status} />
          <Button
            variant="secondary"
            size="sm"
            onClick={reload}
            disabled={busy !== null}
            className="rounded-lg"
            aria-label="Refresh"
          >
            {busy === 'reload' ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            render={<Link href={`/searches/${initial.job.id}/edit`} />}
            className="rounded-lg"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            onClick={runNow}
            disabled={busy !== null}
            className="rounded-lg bg-fg text-bg-elev hover:bg-fg/90"
          >
            {busy === 'run' ? <Spinner /> : <><Play className="h-3.5 w-3.5" />Run now</>}
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
              size="sm"
              onClick={applyFilter}
              disabled={busy !== null || !filter.trim()}
              className="rounded-lg bg-fg text-bg-elev hover:bg-fg/90"
            >
              {busy === 'filter' ? <Spinner /> : <><Sparkles className="h-3 w-3" />Apply</>}
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
          results={results}
          total={initial.total}
          listParams={listParams}
          onView={(next) =>
            router.push(
              buildListSearch(`/searches/${initial.job.id}`, { view: next, page: 1 }, listParams) as never,
            )
          }
          onPage={(next) =>
            router.push(
              buildListSearch(`/searches/${initial.job.id}`, { page: next }, listParams) as never,
            )
          }
        />
      </div>
    </div>
  );
}

function ResultsPanel({
  results,
  total,
  listParams,
  onView,
  onPage,
}: {
  results: ResultView[];
  total: number;
  listParams: ListParams;
  onView: (next: ViewMode) => void;
  onPage: (next: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-bg-elev">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium">Results</span>
          <span className="font-mono text-[11px] text-fg-muted">{total} items</span>
        </div>
        <ViewToggle value={listParams.view} onChange={onView} />
      </div>

      {results.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[13px] font-medium text-fg">No results yet</p>
          <p className="mt-1 text-[12px] text-fg-muted">Press Run now to fire a fresh crawl.</p>
        </div>
      ) : listParams.view === 'list' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-32">When</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
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
          {results.map((r) => (
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
