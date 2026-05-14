'use client';

import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { useDeleteCrawl } from '@/lib/queries/crawls';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  name: string;
  className?: string;
  /** Compact rendering for grid card / row corner. */
  iconOnly?: boolean;
};

export function DeleteCrawlButton({ id, name, className, iconOnly = true }: Props) {
  const remove = useDeleteCrawl();
  const deleting = remove.isPending;

  function onConfirm() {
    remove.mutate(id, {
      onSuccess: () => toast.success(`Deleted "${name}"`),
      onError: (e) =>
        toast.error('Delete failed', { description: (e as Error).message }),
    });
  }

  // Wrap dialog parts in a span+stopPropagation so clicking the button
  // (and anything inside the dialog) doesn't bubble up to a parent row/card
  // click handler that would navigate to the crawl detail page.
  return (
    <span
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn('inline-flex', className)}
    >
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <button
              type="button"
              aria-label={`Delete ${name}`}
              disabled={deleting}
              className={cn(
                'inline-flex items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-bg-sunk hover:text-status-red',
                'disabled:cursor-not-allowed disabled:opacity-50',
                iconOnly
                  ? 'h-8 w-8'
                  : 'h-9 gap-1.5 px-3 text-[13px] font-medium',
              )}
            />
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
          {!iconOnly && 'Delete'}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this crawl?</AlertDialogTitle>
            <AlertDialogDescription>
              All run history and stored results for{' '}
              <span className="font-mono">{name}</span> will be removed. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} disabled={deleting}>
              {deleting ? <Spinner /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  );
}
