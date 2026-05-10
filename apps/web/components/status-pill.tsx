import { cn } from '@/lib/utils';

type Tone = 'running' | 'paused' | 'error' | 'fresh' | 'idle';

const TONE: Record<Tone, { dot: string; text: string; label: string; pulse?: boolean }> = {
  running: { dot: 'bg-status-green', text: 'text-status-green', label: 'Running', pulse: true },
  paused: { dot: 'bg-status-amber', text: 'text-status-amber', label: 'Paused' },
  error: { dot: 'bg-status-red', text: 'text-status-red', label: 'Error' },
  fresh: { dot: 'bg-status-blue', text: 'text-status-blue', label: 'New' },
  idle: { dot: 'bg-fg-subtle', text: 'text-fg-muted', label: 'Idle' },
};

const SEARCH_STATUS_TO_TONE: Record<string, Tone> = {
  RUNNING: 'running',
  PAUSED: 'paused',
  ERROR: 'error',
  OK: 'running',
  PENDING: 'idle',
  APPROVED: 'running',
  DENIED: 'error',
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: Tone | string;
  label?: string;
  className?: string;
}) {
  const tone =
    (SEARCH_STATUS_TO_TONE[status] as Tone | undefined) ?? (status as Tone) ?? 'idle';
  const cfg = TONE[tone] ?? TONE.idle;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-border bg-bg-elev px-1.5 py-0.5 font-mono text-[11px] font-medium',
        cfg.text,
        className,
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', cfg.dot, cfg.pulse && 'status-dot-pulse')}
      />
      {label ?? cfg.label}
    </span>
  );
}
