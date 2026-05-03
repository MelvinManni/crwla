import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SearchView } from '@/lib/types';

export function SearchCard({ search }: { search: SearchView }) {
  return (
    <Link href={`/searches/${search.id}`}>
      <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/40">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{search.name}</h3>
            {search.status === 'PAUSED' && <Badge variant="outline">Paused</Badge>}
            {search.status === 'ERROR' && <Badge variant="destructive">Error</Badge>}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {search.cronLabel} · last run {search.lastRun} · next {search.nextRun}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {search.keywords.slice(0, 4).map((k) => (
              <Badge key={k} variant="secondary" className="font-normal">
                {k}
              </Badge>
            ))}
            {search.keywords.length > 4 && (
              <Badge variant="secondary" className="font-normal">
                +{search.keywords.length - 4}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">{search.results}</div>
          <div className="text-xs text-muted-foreground">results</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Card>
    </Link>
  );
}
