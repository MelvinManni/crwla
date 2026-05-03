'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ExternalLink, Filter, Pencil, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { ResultView } from '@/lib/types';
import {
  useFilterResults,
  useRunSearch,
  useSearchResults,
  type SearchResultsResponse,
} from '@/lib/queries/searches';

export function ResultsClient({
  id,
  initialData,
}: {
  id: string;
  initialData: SearchResultsResponse;
}) {
  const query = useSearchResults(id, {}, { initialData });
  const runMutation = useRunSearch(id);
  const filterMutation = useFilterResults(id);

  const data = query.data ?? initialData;
  const [filterPrompt, setFilterPrompt] = useState(data.job.filterPrompt);

  const baseResults = data.results;
  const filterData = filterMutation.data;
  const results: ResultView[] = filterData?.results ?? baseResults;
  const filterMode = filterData?.mode ?? null;

  const isReloading = query.isFetching;
  const busy = runMutation.isPending || filterMutation.isPending || isReloading;

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={busy}
          >
            {isReloading ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/searches/${data.job.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button size="sm" onClick={() => runMutation.mutate()} disabled={busy}>
            {runMutation.isPending ? (
              <Spinner />
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run now
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{data.job.name}</h1>
        <p className="text-sm text-muted-foreground">
          {data.job.keywords.length} keywords · last run {data.job.lastRun}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {data.job.keywords.map((k) => (
            <Badge key={k} variant="secondary" className="font-normal">
              {k}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Input
          value={filterPrompt}
          onChange={(e) => setFilterPrompt(e.target.value)}
          placeholder="Filter prompt — e.g. skip rumors, only $5M+ rounds"
        />
        <Button
          onClick={() => filterMutation.mutate(filterPrompt)}
          disabled={busy}
          size="sm"
        >
          {filterMutation.isPending ? (
            <Spinner />
          ) : (
            <>
              <Filter className="h-4 w-4" />
              Apply
            </>
          )}
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
                  <img
                    src={r.image}
                    alt=""
                    className="hidden h-16 w-16 rounded object-cover sm:block"
                  />
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
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {r.snippet}
                    </p>
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
