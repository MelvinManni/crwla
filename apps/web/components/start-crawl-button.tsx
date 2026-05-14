'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStartCrawl } from '@/components/start-crawl-modal';

export function StartCrawlButton({
  className,
  label = 'Start a crawl',
  hideOnMobile = false,
}: {
  className?: string;
  label?: string;
  /** Hide on mobile — the floating FAB is the mobile entry point. */
  hideOnMobile?: boolean;
}) {
  const { open } = useStartCrawl();
  return (
    <Button
      data-tour="new-crawl"
      className={cn('rounded-lg', hideOnMobile && 'hidden md:inline-flex', className)}
      onClick={open}
    >
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
