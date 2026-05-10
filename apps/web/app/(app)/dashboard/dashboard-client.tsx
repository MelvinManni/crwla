'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ViewToggle, type ViewMode } from '@/components/view-toggle';
import { Pagination } from '@/components/pagination';
import { KeywordChip } from '@/components/keyword-chip';
import { StatusPill } from '@/components/status-pill';
import { SearchCard } from '@/components/search-card';
import { buildListSearch } from '@/lib/list-state';
import type { SearchView } from '@/lib/types';

export function DashboardClient({
  initial,
  total,
  page,
  pageSize,
  view,
}: {
  initial: SearchView[];
  total: number;
  page: number;
  pageSize: number;
  view: ViewMode;
}) {
  const router = useRouter();
  const current = { page, pageSize, view };

  function setView(next: ViewMode) {
    router.push(buildListSearch('/dashboard', { view: next, page: 1 }, current) as never);
  }
  function setPage(next: number) {
    router.push(buildListSearch('/dashboard', { page: next }, current) as never);
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] text-fg-subtle">
          {total} TOTAL · PAGE {page} · {pageSize}/PAGE
        </span>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {initial.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-bg-elev px-6 py-16 text-center">
          <p className="font-medium">No searches yet</p>
          <p className="mt-1 text-[13px] text-fg-muted">
            Create your first one to start tracking keywords.
          </p>
        </div>
      ) : view === 'list' ? (
        <div className="overflow-hidden rounded-[10px] border border-border bg-bg-elev">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initial.map((j) => (
                <TableRow
                  key={j.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/searches/${j.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{j.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                      {j.results} results
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {j.keywords.slice(0, 2).map((k) => (
                        <KeywordChip key={k} muted>
                          {k}
                        </KeywordChip>
                      ))}
                      {j.keywords.length > 2 && (
                        <span className="self-center font-mono text-[11px] text-fg-subtle">
                          +{j.keywords.length - 2}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-fg-muted">
                    {j.cronLabel}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-fg-muted">
                    {j.lastRun}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={j.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-fg-subtle" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onChange={setPage}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {initial.map((j) => (
              <SearchCard key={j.id} search={j} />
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-[10px] border border-border bg-bg-elev">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onChange={setPage}
              className="border-t-0"
            />
          </div>
        </>
      )}
    </>
  );
}
