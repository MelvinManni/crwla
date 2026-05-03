import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import type { SearchView } from '@/lib/types';
import { SearchCard } from '@/components/search-card';

export default async function DashboardPage() {
  const user = await requireSession();
  const jar = await cookies();
  const cookie = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  const out = await api.get<{ jobs: SearchView[] }>('/searches', { cookie });

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Searches</h1>
          <p className="text-sm text-muted-foreground">
            {out.jobs.length} {out.jobs.length === 1 ? 'search' : 'searches'} · {user.email}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/searches/new">
            <Plus className="h-4 w-4" />
            New search
          </Link>
        </Button>
      </div>

      {out.jobs.length === 0 ? (
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
          {out.jobs.map((j) => (
            <SearchCard key={j.id} search={j} />
          ))}
        </div>
      )}
    </div>
  );
}
