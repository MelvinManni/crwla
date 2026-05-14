'use client';

import { Download, FileSpreadsheet, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type TimeWindow = 'all' | '24h' | '7d' | '30d' | '90d';

export type ListFilters = {
  query: string;
  keyword: string; // '' = any
  time: TimeWindow;
};

const TIME_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const PAGE_SIZE_OPTIONS = [20, 40, 60, 80, 100];

export type SortOption = { value: string; label: string };

export function ListFilterBar({
  filters,
  onFilters,
  keywords,
  pageSize,
  onPageSize,
  onExportCsv,
  onExportXls,
  searchPlaceholder = 'Search by name or keyword…',
  keywordLabel = 'Keyword',
  keywordAnyLabel = 'Any keyword',
  timeLabel = 'Saved',
  className,
  sort,
  sortOptions,
  onSort,
  sortLabel = 'Sort',
}: {
  filters: ListFilters;
  onFilters: (next: ListFilters) => void;
  keywords: string[];
  pageSize: number;
  onPageSize: (next: number) => void;
  onExportCsv: () => void;
  onExportXls: () => void;
  searchPlaceholder?: string;
  keywordLabel?: string;
  keywordAnyLabel?: string;
  timeLabel?: string;
  className?: string;
  /** Current sort value (matches one of `sortOptions[i].value`). Omit to
   *  hide the dropdown. */
  sort?: string;
  sortOptions?: SortOption[];
  onSort?: (next: string) => void;
  sortLabel?: string;
}) {
  const hasFilters =
    filters.query.trim() !== '' || filters.keyword !== '' || filters.time !== 'all';

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-border bg-bg-elev px-3 py-2.5',
        className,
      )}
    >
      <div className="relative w-full min-w-0 sm:w-auto sm:min-w-[220px] sm:flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
        <Input
          value={filters.query}
          onChange={(e) => onFilters({ ...filters, query: e.target.value })}
          placeholder={searchPlaceholder}
          className="h-8 rounded-md pl-8 text-[13px]"
          aria-label="Search"
        />
      </div>

      <FilterSelect
        label={keywordLabel}
        value={filters.keyword}
        onChange={(v) => onFilters({ ...filters, keyword: v })}
        options={[
          { value: '', label: keywordAnyLabel },
          ...keywords.map((k) => ({ value: k, label: k })),
        ]}
      />

      <FilterSelect
        label={timeLabel}
        value={filters.time}
        onChange={(v) => onFilters({ ...filters, time: v as TimeWindow })}
        options={TIME_OPTIONS}
      />

      {sortOptions && sortOptions.length > 0 && onSort && (
        <FilterSelect
          label={sortLabel}
          value={sort ?? sortOptions[0].value}
          onChange={onSort}
          options={sortOptions}
        />
      )}

      <FilterSelect
        label="Per page"
        value={String(pageSize)}
        onChange={(v) => onPageSize(Number(v))}
        options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
      />

      {hasFilters && (
        <button
          type="button"
          onClick={() => onFilters({ query: '', keyword: '', time: 'all' })}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 font-mono text-[11px] text-fg-muted hover:text-fg"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}

      {/* Exports are desktop-only — saving a CSV/XLSX from a phone isn't a
          common flow and the buttons crowd the bar on small screens. */}
      <div className="ml-auto hidden items-center gap-1.5 md:flex">
        <Button
          variant="outline"
          onClick={onExportCsv}
          className="h-8 rounded-md"
          aria-label="Export as CSV"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
        <Button
          variant="outline"
          onClick={onExportXls}
          className="h-8 rounded-md"
          aria-label="Export as Excel"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Excel
        </Button>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-bg px-2 text-[12px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[12px] text-fg outline-none focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
