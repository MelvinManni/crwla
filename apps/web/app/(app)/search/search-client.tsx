'use client';

import { useState } from 'react';
import { ExternalLink, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFulltextSearch } from '@/lib/queries/search';

export function SearchClient() {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [sources, setSources] = useState('');
  const [locations, setLocations] = useState('');

  const mutation = useFulltextSearch();

  function run() {
    if (!q.trim()) return;
    mutation.mutate(
      {
        q: q.trim(),
        source: sources.trim() || undefined,
        location: locations.trim() || undefined,
      },
      {
        onError: (e) =>
          toast({ title: 'Search failed', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  }

  const hits = mutation.data?.hits ?? [];
  const mode = mutation.data?.mode ?? null;
  const busy = mutation.isPending;

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Search results</h1>
        <p className="text-sm text-muted-foreground">
          Full-text search across every result you've collected. Uses Elasticsearch when configured,
          Postgres FTS as fallback.
        </p>
      </div>

      <div className="mb-6 grid gap-3">
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="natural language — e.g. funding -rumors"
          />
          <Button onClick={run} disabled={busy}>
            {busy ? <Spinner /> : <><SearchIcon className="h-4 w-4" />Search</>}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="sources" className="text-xs">
              Sources (comma-separated)
            </Label>
            <Input
              id="sources"
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              placeholder="e.g. Reuters, TechCrunch"
            />
          </div>
          <div>
            <Label htmlFor="locations" className="text-xs">
              Locations
            </Label>
            <Input
              id="locations"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              placeholder="e.g. US, UK"
            />
          </div>
        </div>
      </div>

      {mode && (
        <p className="mb-3 text-xs text-muted-foreground">
          mode: {mode}
          {hits.length > 0 && ` · ${hits.length} hit${hits.length === 1 ? '' : 's'}`}
        </p>
      )}

      {hits.length === 0 && mode && mode !== 'noop' ? (
        <p className="text-sm text-muted-foreground">No matches.</p>
      ) : (
        <div className="space-y-3">
          {hits.map((h) => (
            <Card key={h.id} className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{h.source}</span>
                {h.location && <Badge variant="outline">{h.location}</Badge>}
                {h.score != null && <span>· rank {h.score.toFixed(2)}</span>}
              </div>
              <a
                href={h.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block font-medium hover:underline"
              >
                {h.title}
                <ExternalLink className="ml-1 inline h-3 w-3" />
              </a>
              {h.highlight ? (
                <p
                  className="mt-1 line-clamp-2 text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: h.highlight }}
                />
              ) : (
                h.snippet && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{h.snippet}</p>
                )
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
