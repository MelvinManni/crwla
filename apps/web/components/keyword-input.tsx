'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KeywordInput({
  value,
  onChange,
  placeholder = 'type or paste keywords, separated by commas',
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState('');

  function add(raw: string) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    onChange(next);
    setText('');
  }
  function remove(k: string) {
    onChange(value.filter((x) => x !== k));
  }

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring',
        className,
      )}
    >
      {value.map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
        >
          {k}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => remove(k)}
            aria-label={`remove ${k}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
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
