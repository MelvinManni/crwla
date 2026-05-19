'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'grid';

export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Layout"
      className={cn(
        'max-sm:flex max-sm:flex-col sm:inline-flex items-center rounded-lg border border-border bg-bg-elev p-0.5 w-fit',
        className,
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'list'}
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-colors',
          value === 'list'
            ? 'bg-bg-sunk text-fg'
            : 'text-fg-muted hover:text-fg',
        )}
      >
        <List className="h-3.5 w-3.5" />
        List
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'grid'}
        onClick={() => onChange('grid')}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-colors',
          value === 'grid'
            ? 'bg-bg-sunk text-fg'
            : 'text-fg-muted hover:text-fg',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Grid
      </button>
    </div>
  );
}
