'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ExternalLink, Filter, Pencil, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
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
};

export function ResultsClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [results, setResults] = useState(initial.results);
  const [filterPrompt, setFilterPrompt] = useState(initial.job.filterPrompt);
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
      // Give the worker a moment, then reload.
      setTimeout(reload, 1500);
    } finally {
      setBusy(null);
    }
  }

  async function applyFilter() {
    setBusy('filter');
    try {
      const out = await api.post<{ results: ResultView[]; mode: string }>(
        `/searches/${initial.job.id}/filter`,
        { prompt: filterPrompt },
      );
      setResults(out.results);
      setFilterMode(out.mode);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reload} disabled={busy !== null}>
            {busy === 'reload' ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/searches/${initial.job.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button size="sm" onClick={runNow} disabled={busy !== null}>
            {busy === 'run' ? <Spinner /> : <><Play className="h-4 w-4" />Run now</>}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{initial.job.name}</h1>
        <p className="text-sm text-muted-foreground">
          {initial.job.keywords.length} keywords · last run {initial.job.lastRun}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {initial.job.keywords.map((k) => (
            <Badge key={k} variant="secondary" className="font-normal">{k}</Badge>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Input
          value={filterPrompt}
          onChange={(e) => setFilterPrompt(e.target.value)}
          placeholder="Filter prompt — e.g. skip rumors, only $5M+ rounds"
        />
        <Button onClick={applyFilter} disabled={busy !== null} size="sm">
          {busy === 'filter' ? <Spinner /> : <><Filter className="h-4 w-4" />Apply</>}
        </Button>
      </div>
      {filterMode && (
        <p className="mb-3 text-xs text-muted-foreground">filter mode: {filterMode}</p>
      )}

      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No results yet — try Run now.</p>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                {r.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" className="hidden h-16 w-16 rounded object-cover sm:block" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{r.source}</span>
                    {r.time && <span>· {r.time}</span>}
                    {r.tag && <Badge variant="outline">{r.tag}</Badge>}
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block font-medium hover:underline"
                  >
                    {r.title}
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </a>
                  {r.snippet && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.snippet}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
