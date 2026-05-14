'use client';

import { useState } from 'react';
import { KeywordChip } from '@/components/keyword-chip';
import { cn } from '@/lib/utils';

export function KeywordInput({
  value,
  onChange,
  placeholder = 'type or paste keywords, separated by commas',
  className,
  autoFocus = false,
  max,
  onMaxExceeded,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Hard cap on accepted keywords. Excess is dropped silently — wire
   *  `onMaxExceeded` to show the upgrade modal / toast. */
  max?: number;
  /** Fired when an `add()` (typed entry or paste) tried to push the list
   *  past `max`. Receives the count that would have landed. */
  onMaxExceeded?: (attempted: number) => void;
}) {
  const [text, setText] = useState('');

  function add(raw: string) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const merged = [...value];
    for (const p of parts) if (!merged.includes(p)) merged.push(p);
    let next = merged;
    if (typeof max === 'number' && max >= 0 && merged.length > max) {
      next = merged.slice(0, max);
      // Fire AFTER the slice so the caller sees what we actually accepted
      // and can prompt the user to upgrade for the remainder.
      onMaxExceeded?.(merged.length);
    }
    onChange(next);
    setText('');
  }
  function remove(k: string) {
    onChange(value.filter((x) => x !== k));
  }

  return (
    <div
      className={cn(
        'flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg-elev p-2',
        'focus-within:border-fg focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {value.map((k) => (
        <KeywordChip key={k} onRemove={() => remove(k)}>
          {k}
        </KeywordChip>
      ))}
      <input
        className="min-w-[100px] flex-1 bg-transparent p-1 font-mono text-[13px] text-fg outline-none placeholder:text-fg-subtle"
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) add(v);
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(text);
          } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onPaste={(e) => {
          const t = e.clipboardData.getData('text');
          if (t.includes(',')) {
            e.preventDefault();
            add(text + t);
          }
        }}
        onBlur={() => {
          if (text.trim()) add(text);
        }}
        placeholder={value.length ? '' : placeholder}
      />
    </div>
  );
}
