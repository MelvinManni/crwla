'use client';

/**
 * Inline SVG charts — we don't pull in recharts for one drawer. The line
 * chart shows daily activity counts over the stats window; the bars show
 * the top activity types so an admin can see at a glance whether the
 * member is mostly creating searches, favoriting results, or signing in
 * without doing much else.
 */

export function ActivitySparkline({
  data,
  height = 80,
}: {
  data: Array<{ day: string; count: number }>;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 320;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data
    .map((d, i) => {
      const x = i * stepX;
      const y = height - (d.count / max) * (height - 6) - 3;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-20 w-full"
        role="img"
        aria-label="Daily activity"
      >
        <polygon points={area} fill="currentColor" opacity={0.12} />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-fg-subtle">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}

export function ActivityBars({
  data,
}: {
  data: Array<{ type: string; label: string; count: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.count));
  return (
    <ul className="space-y-1.5">
      {data.map((d) => {
        const pct = max > 0 ? (d.count / max) * 100 : 0;
        return (
          <li key={d.type} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 truncate text-fg-muted" title={d.label}>
              {d.label}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded bg-bg-sunk">
              <div
                className="h-full bg-fg"
                style={{ width: `${pct.toFixed(1)}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums">
              {d.count}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
