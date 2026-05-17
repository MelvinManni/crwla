'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeywordChip } from '@/components/keyword-chip';
import { StatusPill } from '@/components/status-pill';
import { DeleteCrawlButton } from '@/components/delete-crawl-button';
import type { SearchView } from '@/lib/types';

export function SearchCard({ search }: { search: SearchView }) {
  const router = useRouter();
  const href = `/crawls/${search.id}` as const;

  // Belt-and-suspenders prefetch: Next App Router prefetches Links in
  // viewport already, but firing prefetch() on pointer-enter warms the
  // RSC cache for the moment the cursor crosses the card — so by the
  // time the click lands, the next page is essentially instant.
  function warm() {
    router.prefetch(href);
  }

  return (
    <div
      className="group relative rounded-[10px] border border-border bg-bg-elev p-4 transition-colors hover:border-border-strong"
      onPointerEnter={warm}
      onFocus={warm}
    >
      {/* Full-card click target. Stretched-link pattern so the delete
          button can live as a sibling without nesting an <a> around a
          <button>. */}
      <Link
        href={href}
        prefetch
        aria-label={`Open ${search.name}`}
        className="absolute inset-0 z-0 rounded-[10px]"
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{search.name}</h3>
          <p className="mt-1 font-mono text-[11px] text-fg-subtle">
            {search.results} results
          </p>
        </div>
        {/* Delete icon is always visible — no hover gymnastics. The
            button itself stops propagation so clicking it doesn't fire
            the stretched-link navigation. */}
        <div className="flex items-center gap-1">
          <DeleteCrawlButton id={search.id} name={search.name} />
          <StatusPill status={search.status} />
        </div>
      </div>

      <div className="pointer-events-none relative z-0 mt-3 flex flex-wrap gap-1.5">
        {search.keywords.slice(0, 6).map((k) => (
          <KeywordChip key={k}>{k}</KeywordChip>
        ))}
        {search.keywords.length > 6 && (
          <span className="self-center font-mono text-[11px] text-fg-subtle">
            +{search.keywords.length - 6}
          </span>
        )}
      </div>

      <div className="pointer-events-none relative z-0 mt-3 flex gap-4 border-t border-dashed border-border pt-3 font-mono text-[11px] text-fg-muted">
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
    </div>
  );
}
