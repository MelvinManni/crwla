import Link from 'next/link';
import { KeywordChip } from '@/components/keyword-chip';
import { StatusPill } from '@/components/status-pill';
import type { SearchView } from '@/lib/types';

export function SearchCard({ search }: { search: SearchView }) {
  return (
    <Link
      href={`/crawls/${search.id}`}
      className="block rounded-[10px] border border-border bg-bg-elev p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{search.name}</h3>
          <p className="mt-1 font-mono text-[11px] text-fg-subtle">
            {search.results} results
          </p>
        </div>
        <StatusPill status={search.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {search.keywords.slice(0, 6).map((k) => (
          <KeywordChip key={k}>{k}</KeywordChip>
        ))}
        {search.keywords.length > 6 && (
          <span className="self-center font-mono text-[11px] text-fg-subtle">
            +{search.keywords.length - 6}
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-4 border-t border-dashed border-border pt-3 font-mono text-[11px] text-fg-muted">
        <div>
          <span className="mr-1 text-fg-subtle">cron</span>
          {search.cronLabel.toLowerCase()}
        </div>
        <div>
          <span className="mr-1 text-fg-subtle">last</span>
          {search.lastRun}
        </div>
        <div>
          <span className="mr-1 text-fg-subtle">next</span>
          {search.nextRun}
        </div>
      </div>
    </Link>
  );
}
