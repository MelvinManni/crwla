'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchCard } from '@/components/search-card';
import { useSearchesList, type SearchesListResponse } from '@/lib/queries/searches';

export function DashboardClient({
  email,
  initialData,
}: {
  email: string;
  initialData: SearchesListResponse;
}) {
  const { data } = useSearchesList({}, { initialData });
  const jobs = data?.jobs ?? [];

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Searches</h1>
          <p className="text-sm text-muted-foreground">
            {jobs.length} {jobs.length === 1 ? 'search' : 'searches'} · {email}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/searches/new">
            <Plus className="h-4 w-4" />
            New search
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-6 py-16 text-center">
          <p className="font-medium">No searches yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first one to start tracking keywords.</p>
          <Button asChild className="mt-4">
            <Link href="/searches/new">
              <Plus className="h-4 w-4" />
              New search
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <SearchCard key={j.id} search={j} />
          ))}
        </div>
      )}
    </div>
  );
}
