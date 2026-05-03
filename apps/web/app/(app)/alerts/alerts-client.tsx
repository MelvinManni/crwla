'use client';

import { useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  type AlertsListResponse,
  useAlertsList,
  useCreateAlert,
  useDeleteAlert,
  useToggleAlert,
} from '@/lib/queries/alerts';
import type { AlertFrequency, AlertView } from '@/lib/types';

const FREQUENCIES: AlertFrequency[] = ['REALTIME', 'HOURLY', 'DAILY'];

function showError(e: unknown) {
  toast({
    title: 'Something went wrong',
    description: e instanceof Error ? e.message : 'Please try again.',
    variant: 'destructive',
  });
}

export function AlertsClient({ initialData }: { initialData: AlertsListResponse }) {
  const params = { page: 1, pageSize: 50 };
  const { data } = useAlertsList(params, { initialData });
  const alerts = data?.alerts ?? [];

  const [keyword, setKeyword] = useState('');
  const [frequency, setFrequency] = useState<AlertFrequency>('DAILY');

  const createMutation = useCreateAlert();

  function handleCreate(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) return;
    createMutation.mutate(
      { keyword: trimmed, frequency },
      {
        onSuccess: () => {
          setKeyword('');
          setFrequency('DAILY');
          toast({ title: 'Alert created' });
        },
        onError: showError,
      },
    );
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
          </p>
        </div>
      </div>

      <Card className="mb-6 p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={handleCreate}>
          <div className="flex-1 min-w-[220px]">
            <Label htmlFor="alert-keyword">Keyword</Label>
            <Input
              id="alert-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. open source"
              disabled={createMutation.isPending}
            />
          </div>
          <div>
            <Label htmlFor="alert-frequency">Frequency</Label>
            <select
              id="alert-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as AlertFrequency)}
              disabled={createMutation.isPending}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm" disabled={createMutation.isPending || !keyword.trim()}>
            {createMutation.isPending ? 'Creating…' : 'Create alert'}
          </Button>
        </form>
      </Card>

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-6 py-16 text-center">
          <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-medium">No alerts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first alert to be notified about new matches.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertView }) {
  const toggleMutation = useToggleAlert(alert.id);
  const deleteMutation = useDeleteAlert(alert.id);
  const busy = toggleMutation.isPending || deleteMutation.isPending;

  return (
    <Card className="flex items-center justify-between p-3 px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{alert.keyword}</span>
          <Badge variant="secondary">{alert.frequency}</Badge>
          {!alert.active && <Badge variant="destructive">Paused</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {alert.lastTriggered
            ? `Last triggered ${new Date(alert.lastTriggered).toLocaleString()}`
            : 'Never triggered'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            toggleMutation.mutate({ active: !alert.active }, { onError: showError })
          }
        >
          {alert.active ? 'Pause' : 'Resume'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => deleteMutation.mutate(undefined, { onError: showError })}
          aria-label="Delete alert"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
