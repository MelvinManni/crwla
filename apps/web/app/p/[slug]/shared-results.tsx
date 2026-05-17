import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { SharedSearchView } from '@/lib/types';

/**
 * Read-only public view of a shared crawl. No favorite/hide actions — the
 * viewer has no session.
 */
export function SharedResultsView({ data }: { data: SharedSearchView }) {
  const { search, results, total } = data;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10">
      <header className="mb-6 border-b border-border pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
          Shared crawl · {search.ownerName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {search.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {search.keywords.map((k) => (
            <Badge key={k} variant="outline" className="font-mono text-[10px]">
              {k}
            </Badge>
          ))}
        </div>
        <p className="mt-2 font-mono text-[11px] text-fg-subtle">
          {total} {total === 1 ? 'result' : 'results'} · last run {search.lastRun}
        </p>
      </header>

      {results.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted">
          No results yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {results.map((r) => (
            // r.url is unique per shared crawl (DB enforces searchId +
            // urlHash uniqueness) so it's a stable React key without
            // having to expose an internal id.
            <li key={r.url}>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  {r.image && (
                    // Plain <img> — no next/image config for arbitrary
                    // remote hosts on the public page.
                    <img
                      src={r.image}
                      alt=""
                      className="hidden h-16 w-16 shrink-0 rounded border border-border object-cover sm:block"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {/* Plain <a> — r.url is an arbitrary external URL,
                        which next/link rejects under typedRoutes. */}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-start gap-1.5 text-[15px] font-medium hover:underline"
                    >
                      <span className="min-w-0">{r.title}</span>
                      <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-fg-muted" />
                    </a>
                    {r.snippet && (
                      <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
                        {r.snippet}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                      {r.source}
                      {r.time ? ` · ${r.time}` : ''}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-10 border-t border-border pt-4 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
        Powered by{' '}
        <Link href="/" className="hover:underline">
          CRWLA
        </Link>
      </footer>
    </div>
  );
}
