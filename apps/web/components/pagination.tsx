'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (next: number) => void;
  className?: string;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3',
        className,
      )}
    >
      <span className="font-mono text-[11px] text-fg-muted">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          className="h-7 w-7 rounded-md"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="px-2 font-mono text-[11px] text-fg-muted">
          {page} / {lastPage}
        </span>
        <Button
          size="icon-sm"
          variant="outline"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          className="h-7 w-7 rounded-md"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
