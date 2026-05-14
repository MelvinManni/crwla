'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Overflow } from '@/components/ui/overflow';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ViewToggle, type ViewMode } from '@/components/view-toggle';
import { Pagination } from '@/components/pagination';
import { buildListSearch, type ListParams } from '@/lib/list-state';
import { useToast } from '@/hooks/use-toast';
import {
  useAlerts,
  useCreateAlert,
  useDeleteAlert,
  useUpdateAlert,
  type AlertsListResponse,
} from '@/lib/queries/alerts';
import { useIsMobile } from '@/hooks/use-mobile';
import type { AlertView } from './page';

type Frequency = 'REALTIME' | 'HOURLY' | 'DAILY';

export function AlertsClient({
  initialAlerts,
  total: initialTotal,
  listParams,
}: {
  initialAlerts: AlertView[];
  total: number;
  listParams: ListParams;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  // Mobile cramps the 5-column alerts table; force the grid view there.
  const effectiveView = isMobile ? 'grid' : listParams.view;

  // Seed the list query from SSR so mutations can invalidate cleanly.
  const initialData: AlertsListResponse = {
    alerts: initialAlerts,
    total: initialTotal,
    page: listParams.page,
    pageSize: listParams.pageSize,
    hasMore: false,
  };
  const listQuery = useAlerts(listParams, { initialData });
  const alerts = listQuery.data?.alerts ?? initialAlerts;
  const total = listQuery.data?.total ?? initialTotal;

  const createMut = useCreateAlert();
  const updateMut = useUpdateAlert();
  const deleteMut = useDeleteAlert();

  const [keyword, setKeyword] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('DAILY');

  const busy =
    createMut.isPending
      ? 'create'
      : updateMut.isPending
        ? updateMut.variables?.id ?? null
        : deleteMut.isPending
          ? deleteMut.variables ?? null
          : null;

  function setView(next: ViewMode) {
    router.push(buildListSearch('/alerts', { view: next, page: 1 }, listParams) as never);
  }
  function setPage(next: number) {
    router.push(buildListSearch('/alerts', { page: next }, listParams) as never);
  }

  function create() {
    if (!keyword.trim()) return;
    createMut.mutate(
      { keyword: keyword.trim(), frequency },
      {
        onSuccess: () => {
          setKeyword('');
          toast({ title: 'Alert created' });
        },
        onError: (e) =>
          toast({ title: 'Create failed', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  }

  function toggle(a: AlertView) {
    updateMut.mutate(
      { id: a.id, active: !a.active },
      {
        onError: (e) =>
          toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  }

  function remove(id: string) {
    deleteMut.mutate(id, {
      onSuccess: () => toast({ title: 'Alert removed' }),
      onError: (e) =>
        toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' }),
    });
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Alerts</h1>
        <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
          {total} ALERT{total === 1 ? '' : 'S'}
        </p>
      </div>

      <Card className="mb-6 rounded-[10px] border-border p-4">
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="alert-kw">Keyword</Label>
            <Input
              id="alert-kw"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder='e.g. "Series B" funding'
            />
          </div>
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <div className="flex gap-2">
              {(['REALTIME', 'HOURLY', 'DAILY'] as Frequency[]).map((f) => (
                <Button
                  key={f}
                  variant={frequency === f ? 'default' : 'outline'}
                  onClick={() => setFrequency(f)}
                >
                  {f.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={create} disabled={!keyword.trim()} loading={busy === 'create'}>
            <Plus className="h-4 w-4" />
            Create alert
          </Button>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] text-fg-subtle">
          {total} TOTAL · PAGE {listParams.page} · {listParams.pageSize}/PAGE
        </span>
        <div className="hidden md:block">
          <ViewToggle value={listParams.view} onChange={setView} />
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-bg-elev px-6 py-16 text-center">
          <Bell className="mx-auto h-6 w-6 text-fg-muted" />
          <p className="mt-2 font-medium">No alerts yet</p>
          <p className="mt-1 text-[13px] text-fg-muted">
            Create one above to get notified when matching results land.
          </p>
        </div>
      ) : effectiveView === 'list' ? (
        <Overflow className="rounded-[10px] border border-border bg-bg-elev">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last triggered</TableHead>
                <TableHead className="w-44 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.keyword}</div>
                    {(a.sources.length > 0 || a.locations.length > 0) && (
                      <div className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                        {a.sources.length > 0 && `sources: ${a.sources.join(', ')}`}
                        {a.locations.length > 0 && `${a.sources.length ? ' · ' : ''}locations: ${a.locations.join(', ')}`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-fg-muted">
                    {a.frequency.toLowerCase()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.active ? 'default' : 'secondary'}>
                      {a.active ? 'Active' : 'Paused'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-fg-muted">
                    {a.lastTriggered ?? 'never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        disabled={busy === a.id}
                        onClick={() => toggle(a)}
                      >
                        {a.active ? 'Pause' : 'Resume'}
                      </Button>
                      <DeleteAlertButton alert={a} disabled={busy === a.id} onConfirm={() => remove(a.id)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={listParams.page} pageSize={listParams.pageSize} total={total} onChange={setPage} />
        </Overflow>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {alerts.map((a) => (
              <Card key={a.id} className="rounded-[10px] border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{a.keyword}</span>
                      <Badge variant={a.active ? 'default' : 'secondary'}>
                        {a.active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                      {a.frequency.toLowerCase()} ·{' '}
                      {a.lastTriggered ? `last triggered ${a.lastTriggered}` : 'never triggered'}
                    </p>
                  </div>
                </div>
                {(a.sources.length > 0 || a.locations.length > 0) && (
                  <p className="mt-3 border-t border-dashed border-border pt-2 font-mono text-[11px] text-fg-muted">
                    {a.sources.length > 0 && `sources: ${a.sources.join(', ')}`}
                    {a.locations.length > 0 && `${a.sources.length ? ' · ' : ''}locations: ${a.locations.join(', ')}`}
                  </p>
                )}
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" disabled={busy === a.id} onClick={() => toggle(a)}>
                    {a.active ? 'Pause' : 'Resume'}
                  </Button>
                  <DeleteAlertButton alert={a} disabled={busy === a.id} onConfirm={() => remove(a.id)} />
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-[10px] border border-border bg-bg-elev">
            <Pagination
              page={listParams.page}
              pageSize={listParams.pageSize}
              total={total}
              onChange={setPage}
              className="border-t-0"
            />
          </div>
        </>
      )}
    </div>
  );
}

function DeleteAlertButton({
  alert,
  disabled,
  onConfirm,
}: {
  alert: AlertView;
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" disabled={disabled} />}>
        <Trash2 className="h-4 w-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this alert?</AlertDialogTitle>
          <AlertDialogDescription>
            You won't receive notifications for "{alert.keyword}" any more.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
