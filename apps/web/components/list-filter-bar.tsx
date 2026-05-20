'use client';

import {
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Filter as FilterIcon,
  Search as SearchIcon,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

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

/**
 * Optional AI-prompt filter block. Crawl results pass this in; list
 * pages without LLM filtering omit it and the AI prompt accordion item
 * just doesn't render.
 */
export type AiPromptFilter = {
  value: string;
  onChange: (next: string) => void;
  onApply: () => void;
  applied: string | null;
  onClear: () => void;
  mode: string | null;
  busy?: boolean;
};

// Filter-scoped wrappers around the shared Accordion primitive. They bake
// in the open-state highlight (sunk bg on the trigger row and the panel
// body) so each filter section reads as one active strip.
//
// Trigger and Content key off the parent Item's `data-open` via a named
// Tailwind group. Base-UI puts different attributes on each part — Item
// and Panel use `data-open`, Trigger uses `data-panel-open` — so reading
// from the Item is the only source that lights up the whole section
// consistently.
function FilterAccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionItem>) {
  return (
    <AccordionItem
      className={cn('group/filter-item', className)}
      {...props}
    />
  );
}

function FilterAccordionTrigger({
  className,
  ...props
}: ComponentProps<typeof AccordionTrigger>) {
  return (
    <AccordionTrigger
      className={cn(
        'px-3',
        'group-data-[open]/filter-item:bg-bg-sunk group-data-[open]/filter-item:text-fg group-data-[open]/filter-item:hover:bg-bg-sunk',
        className,
      )}
      {...props}
    />
  );
}

function FilterAccordionContent({
  className,
  ...props
}: ComponentProps<typeof AccordionContent>) {
  return (
    <AccordionContent
      className={cn('group-data-[open]/filter-item:bg-bg-sunk', className)}
      {...props}
    />
  );
}

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
  aiPrompt,
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
  aiPrompt?: AiPromptFilter;
}) {
  // Search lives inline in the bar now (not inside the dropdown), so it's
  // visually self-evident and doesn't count toward the "Filters · N" badge.
  // It IS still wiped by Clear-all so the user has one place to reset
  // everything they typed across the bar.
  const activeCount = [
    filters.keyword !== '',
    filters.time !== 'all',
    !!aiPrompt?.applied,
  ].filter(Boolean).length;
  const hasFilters = activeCount > 0;
  const hasSearch = filters.query.trim() !== '';

  const activeSortLabel =
    sortOptions?.find((o) => o.value === sort)?.label ?? sortOptions?.[0]?.label;

  function clearAll() {
    onFilters({ query: '', keyword: '', time: 'all' });
    aiPrompt?.onClear();
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-border bg-bg-elev px-3 py-2.5',
        className,
      )}
    >
      {/* Inline search — primary control, sits outside the filter
          dropdown. The dropdown's Clear-all still empties this field so
          there's one place to reset everything across the bar. */}
      <div className="relative min-w-[200px] max-w-[320px] flex-1">
        <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
        <Input
          value={filters.query}
          onChange={(e) => onFilters({ ...filters, query: e.target.value })}
          placeholder={searchPlaceholder}
          className="h-8 rounded-md pl-7 pr-7 text-[13px]"
          aria-label="Search"
        />
        {hasSearch && (
          <button
            type="button"
            onClick={() => onFilters({ ...filters, query: '' })}
            className="absolute right-1.5 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-fg-muted hover:bg-bg-sunk hover:text-fg"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Filter dropdown */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="h-8 rounded-md"
              aria-label="Open filters"
            >
              <FilterIcon className="h-3.5 w-3.5" />
              {hasFilters ? `Filters · ${activeCount}` : 'Filter'}
            </Button>
          }
        />
        <PopoverContent
          align="start"
          className="w-[340px] p-0 max-h-[450px] overflow-y-auto"
        >
          {/* The min/max-height + scroll lives on the inner wrapper so
              a per-page-applied "Clear all" footer stays sticky and
              the accordion content scrolls inside the box. */}
          <div className="flex max-h-[65vh] min-h-[350px] flex-col">
            <div className="flex-1 overflow-y-auto">
              <Accordion defaultValue={['keyword']}>
                <FilterAccordionItem value="keyword">
                  <FilterAccordionTrigger>
                    <span className="text-[12px] font-medium">{keywordLabel}</span>
                    {filters.keyword && (
                      <span
                        className="max-w-[14ch] truncate rounded-full bg-bg-sunk px-2 py-0.5 font-mono text-[10px] text-fg-muted"
                        title={filters.keyword}
                      >
                        {filters.keyword}
                      </span>
                    )}
                  </FilterAccordionTrigger>
                  <FilterAccordionContent>
                    <RadioGroup
                      value={filters.keyword}
                      onChange={(v) => onFilters({ ...filters, keyword: v })}
                      options={[
                        { value: '', label: keywordAnyLabel },
                        ...keywords.map((k) => ({ value: k, label: k })),
                      ]}
                    />
                  </FilterAccordionContent>
                </FilterAccordionItem>

                <FilterAccordionItem value="time">
                  <FilterAccordionTrigger>
                    <span className="text-[12px] font-medium">{timeLabel}</span>
                    {filters.time !== 'all' && (
                      <span className="rounded-full bg-bg-sunk px-2 py-0.5 font-mono text-[10px] text-fg-muted">
                        {TIME_OPTIONS.find((o) => o.value === filters.time)?.label}
                      </span>
                    )}
                  </FilterAccordionTrigger>
                  <FilterAccordionContent>
                    <RadioGroup
                      value={filters.time}
                      onChange={(v) =>
                        onFilters({ ...filters, time: v as TimeWindow })
                      }
                      options={TIME_OPTIONS}
                    />
                  </FilterAccordionContent>
                </FilterAccordionItem>

                <FilterAccordionItem value="page-size">
                  <FilterAccordionTrigger>
                    <span className="text-[12px] font-medium">Per page</span>
                    <span className="rounded-full bg-bg-sunk px-2 py-0.5 font-mono text-[10px] text-fg-muted">
                      {pageSize}
                    </span>
                  </FilterAccordionTrigger>
                  <FilterAccordionContent>
                    <RadioGroup
                      value={String(pageSize)}
                      onChange={(v) => onPageSize(Number(v))}
                      options={PAGE_SIZE_OPTIONS.map((n) => ({
                        value: String(n),
                        label: String(n),
                      }))}
                    />
                  </FilterAccordionContent>
                </FilterAccordionItem>

                {aiPrompt && (
                  <FilterAccordionItem value="ai-prompt">
                    <FilterAccordionTrigger>
                      <Sparkles className="h-3 w-3 text-fg-muted" />
                      <span className="text-[12px] font-medium">AI prompt</span>
                      {aiPrompt.applied && (
                        <span className="rounded-full bg-bg-sunk px-2 py-0.5 font-mono text-[10px] text-fg-muted">
                          active
                        </span>
                      )}
                    </FilterAccordionTrigger>
                    <FilterAccordionContent>
                      <div className="space-y-2 px-3 pb-3">
                        <Textarea
                          value={aiPrompt.value}
                          onChange={(e) => aiPrompt.onChange(e.target.value)}
                          placeholder="Only Series A or later, surface NA companies, skip rumors."
                          className="min-h-[64px] rounded-md text-[12px]"
                        />
                        <Button
                          onClick={aiPrompt.onApply}
                          disabled={aiPrompt.busy || !aiPrompt.value.trim()}
                          loading={aiPrompt.busy}
                          className="h-8 w-full rounded-md bg-fg text-bg-elev hover:bg-fg/90"
                        >
                          <Sparkles className="h-3 w-3" />
                          Apply prompt
                        </Button>
                        {aiPrompt.applied && (
                          <div className="flex items-start gap-2 rounded-md bg-bg-sunk px-2 py-1.5 text-[11px]">
                            <span className="flex-1 text-fg">{aiPrompt.applied}</span>
                            <button
                              onClick={aiPrompt.onClear}
                              className="shrink-0 font-mono text-[10px] text-fg-muted hover:text-fg"
                            >
                              clear
                            </button>
                          </div>
                        )}
                        {aiPrompt.mode && (
                          <p className="font-mono text-[10px] text-fg-subtle">
                            filter mode: {aiPrompt.mode}
                          </p>
                        )}
                      </div>
                    </FilterAccordionContent>
                  </FilterAccordionItem>
                )}
              </Accordion>
            </div>
            {hasFilters && (
              <div className="border-t border-border p-2">
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex h-7 w-full items-center justify-center gap-1 rounded-md font-mono text-[11px] text-fg-muted hover:bg-bg-sunk hover:text-fg"
                >
                  <X className="h-3 w-3" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort dropdown */}
      {sortOptions && sortOptions.length > 0 && onSort && (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="h-8 rounded-md"
                aria-label="Open sort"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {activeSortLabel ?? sortLabel}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-[240px] p-1 max-h-[450px] overflow-y-auto">
            <ul className="space-y-0.5">
              {sortOptions.map((o) => {
                const active = (sort ?? sortOptions[0].value) === o.value;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => onSort(o.value)}
                      className={cn(
                        'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] text-fg hover:bg-bg-sunk',
                        active && 'bg-bg-sunk font-medium',
                      )}
                    >
                      {o.label}
                      {active && (
                        <span className="font-mono text-[10px] text-fg-subtle">
                          active
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
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

function RadioGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <ul className="space-y-0.5 px-1.5 pb-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <li key={o.value}>
            <button
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] hover:bg-bg-sunk',
                active && 'bg-bg-sunk font-medium text-fg',
              )}
            >
              <span className="truncate">{o.label}</span>
              {active && (
                <span className="ml-2 font-mono text-[10px] text-fg-subtle">
                  selected
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
