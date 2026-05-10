'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceCategory, SourceMeta } from '@/lib/types';

const CATEGORY_LABEL: Record<SourceCategory, string> = {
  news: 'News',
  social: 'Social',
  forums: 'Forums',
  blogs: 'Blogs',
};

export function SourcePicker({
  all,
  selected,
  onChange,
  disabledCategories,
}: {
  /** Full catalogue from /api/sources `all` so we can render forbidden ones as locked. */
  all: SourceMeta[];
  /** Currently-selected source ids. */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Categories the current user cannot access. */
  disabledCategories: ReadonlyArray<SourceCategory>;
}) {
  const denied = new Set(disabledCategories);

  // Group by category for the rendered list.
  const byCategory = new Map<SourceCategory, SourceMeta[]>();
  for (const s of all) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }

  function toggle(id: string) {
    const set = new Set(selected);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  }

  return (
    <div className="space-y-3">
      {(['news', 'social', 'forums', 'blogs'] as SourceCategory[]).map((cat) => {
        const sources = byCategory.get(cat);
        if (!sources || sources.length === 0) return null;
        const locked = denied.has(cat);
        return (
          <div key={cat}>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                {CATEGORY_LABEL[cat]}
              </span>
              {locked && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-fg-subtle">
                  <Lock className="h-2.5 w-2.5" />
                  disabled by admin
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sources.map((s) => {
                const active = selected.includes(s.id);
                const isLocked = locked;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => !isLocked && toggle(s.id)}
                    disabled={isLocked}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg border bg-bg-elev px-3 py-2 text-left text-[13px] transition-colors',
                      isLocked
                        ? 'cursor-not-allowed border-border opacity-50'
                        : active
                          ? 'border-fg shadow-[0_0_0_3px_rgba(0,0,0,0.04)]'
                          : 'border-border hover:border-border-strong',
                    )}
                  >
                    <span className="truncate font-medium">{s.label}</span>
                    {active && !isLocked && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg" />
                    )}
                    {isLocked && <Lock className="h-3 w-3 shrink-0 text-fg-subtle" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
