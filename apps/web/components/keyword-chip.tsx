import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KeywordChip({
  children,
  onRemove,
  muted,
  className,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border border-border bg-bg-sunk px-1.5 py-0.5 font-mono text-[11px]',
        muted ? 'text-fg-muted' : 'text-fg',
        onRemove && 'pl-2',
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove keyword"
          className="grid h-3.5 w-3.5 place-items-center rounded-sm text-fg-subtle hover:bg-border hover:text-fg"
        >
          <X className="h-2.5 w-2.5" strokeWidth={2.4} />
        </button>
      )}
    </span>
  );
}
