'use client';

import { cn } from '@/lib/utils';
import type { CronPreset } from '@/lib/types';
import { useEntitlements, PlanLock } from '@/components/billing/entitlements-provider';
import { useUpgradeModal } from '@/components/billing/upgrade-modal';

const PRESETS: Array<{ id: CronPreset; title: string; sub: string; requires: string }> = [
  { id: 'HOURLY', title: 'Hourly', sub: 'EVERY HOUR · ON THE HOUR', requires: 'Pro' },
  { id: 'DAILY', title: 'Daily', sub: 'EVERY DAY · 09:00', requires: 'Basic' },
  { id: 'WEEKLY', title: 'Weekly', sub: 'MONDAYS · 08:00', requires: 'Starter' },
  { id: 'MANUAL', title: 'Manual', sub: 'RUN ON-DEMAND ONLY', requires: 'Free' },
];

export function CronPicker({
  value,
  onChange,
}: {
  value: CronPreset;
  onChange: (next: CronPreset) => void;
}) {
  const { ent } = useEntitlements();
  const { showLimit } = useUpgradeModal();
  const allowed = new Set(ent?.limits.cron ?? ['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL']);

  return (
    <div className="grid md:grid-cols-2 gap-2">
      {PRESETS.map((p) => {
        const active = value === p.id;
        const locked = !allowed.has(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (locked) {
                showLimit({
                  reason: `${p.title} scheduling isn't on your plan.`,
                  recommendedTier: p.requires,
                });
                return;
              }
              onChange(p.id);
            }}
            className={cn(
              'relative flex flex-col gap-1 rounded-lg border bg-bg-elev p-3 text-left transition-colors',
              active
                ? 'border-fg shadow-[0_0_0_3px_rgba(0,0,0,0.04)]'
                : 'border-border hover:border-border-strong',
              locked && 'opacity-60',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium">{p.title}</span>
              <PlanLock unlocked={!locked} requires={p.requires} />
            </div>
            <span className="font-mono text-[10px] tracking-wider text-fg-muted">{p.sub}</span>
            {active && !locked && (
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-fg" />
            )}
          </button>
        );
      })}
    </div>
  );
}
