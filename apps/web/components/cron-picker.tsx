'use client';

import { cn } from '@/lib/utils';
import type { CronPreset } from '@/lib/types';

const PRESETS: Array<{ id: CronPreset; title: string; sub: string }> = [
  { id: 'HOURLY', title: 'Hourly', sub: 'Every hour, on the hour' },
  { id: 'DAILY', title: 'Daily', sub: 'Every day at 09:00' },
  { id: 'WEEKLY', title: 'Weekly', sub: 'Mondays at 08:00' },
  { id: 'MANUAL', title: 'Manual', sub: 'Run on-demand only' },
];

export function CronPicker({
  value,
  onChange,
}: {
  value: CronPreset;
  onChange: (next: CronPreset) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={cn(
            'flex flex-col items-start rounded-md border px-3 py-2 text-left transition-colors',
            value === p.id
              ? 'border-primary bg-primary/5'
              : 'border-input hover:bg-accent/40',
          )}
        >
          <span className="text-sm font-medium">{p.title}</span>
          <span className="text-xs text-muted-foreground">{p.sub}</span>
        </button>
      ))}
    </div>
  );
}
