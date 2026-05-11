'use client';

import { Plus } from 'lucide-react';
import { useStartCrawl } from '@/components/start-crawl-modal';

export function MobileFab() {
  const { open } = useStartCrawl();

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Start a crawl"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-fg text-bg-elev shadow-lg ring-1 ring-border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 md:hidden"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
