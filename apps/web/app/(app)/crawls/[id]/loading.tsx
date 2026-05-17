import { Skeleton } from '@/components/ui/skeleton';

/**
 * Suspense fallback for `/crawls/[id]`. Next renders this the moment a
 * user clicks the card on the dashboard, before the server finishes
 * fetching results — so the navigation feels instant. The shape
 * mirrors the real header in `results-client.tsx` so the layout
 * doesn't jump when content arrives.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border bg-bg px-4 py-4 md:flex-row md:items-start md:justify-between md:gap-2 md:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Keyword strip */}
      <div className="flex flex-wrap gap-1.5 border-b border-border bg-bg px-4 py-3 md:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-md" />
        ))}
      </div>

      {/* Filter block + results */}
      <div className="space-y-3 px-4 pt-4 md:px-6">
        <Skeleton className="h-24 w-full rounded-[10px]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[10px]" />
        ))}
      </div>
    </div>
  );
}
