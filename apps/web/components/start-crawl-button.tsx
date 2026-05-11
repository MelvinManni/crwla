'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStartCrawl } from '@/components/start-crawl-modal';

export function StartCrawlButton({
  className,
  label = 'Start a crawl',
}: {
  className?: string;
  label?: string;
}) {
  const { open } = useStartCrawl();
  return (
    <Button size="sm" className={className ?? 'rounded-lg'} onClick={open}>
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
