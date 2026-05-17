'use client';

import { useState } from 'react';
import { Archive, Pencil, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useArchivePlan,
  useRestorePlan,
  useSyncPlanToPolar,
} from '@/lib/queries/admin';
import { EditPlanDrawer } from './edit-plan-drawer';

/** Derived feature bullet — produced by deriveFeatures() on the API. */
export type AdminPlanFeature = {
  key: string;
  label: string;
  included: true;
  sortOrder: number;
};

export type AdminPlan = {
  id: string;
  tier: 'FREE' | 'STARTER' | 'BASIC' | 'PRO' | 'BUSINESS';
  name: string;
  description: string | null;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  polarProductId: string | null;
  polarPriceMonthlyId: string | null;
  polarPriceYearlyId: string | null;
  limits: Record<string, unknown>;
  features: AdminPlanFeature[];
  active: boolean;
  sortOrder: number;
};

export function AdminBillingClient({
  initialPlans,
  polarConfigured,
}: {
  initialPlans: AdminPlan[];
  polarConfigured: boolean;
}) {
  const { toast } = useToast();
  // We render the plan list straight from SSR initialData. Mutations
  // invalidate the admin-billing-plans query so any future fetch is fresh.
  // The page is server-rendered so an explicit `router.refresh()` happens
  // on dialog close to pull the next render's data.
  const [plans, setPlans] = useState(initialPlans);
  const [editing, setEditing] = useState<AdminPlan | null>(null);

  const archiveMut = useArchivePlan();
  const restoreMut = useRestorePlan();
  const syncMut = useSyncPlanToPolar();

  const busy = archiveMut.isPending
    ? archiveMut.variables ?? null
    : restoreMut.isPending
      ? restoreMut.variables ?? null
      : syncMut.isPending
        ? syncMut.variables ?? null
        : null;

  function archive(p: AdminPlan) {
    if (!confirm(`Archive ${p.name}? Existing subscribers keep it; pickers hide it.`)) return;
    archiveMut.mutate(p.id, {
      onSuccess: (updated) => {
        setPlans((arr) => arr.map((x) => (x.id === p.id ? updated : x)));
        toast({ title: 'Archived', description: `${p.name} hidden from pickers.` });
      },
      onError: (e) =>
        toast({ title: 'Archive failed', description: (e as Error).message, variant: 'destructive' }),
    });
  }

  function restore(p: AdminPlan) {
    restoreMut.mutate(p.id, {
      onSuccess: (updated) => {
        setPlans((arr) => arr.map((x) => (x.id === p.id ? updated : x)));
        toast({ title: 'Restored' });
      },
      onError: (e) =>
        toast({ title: 'Restore failed', description: (e as Error).message, variant: 'destructive' }),
    });
  }

  function syncPolar(p: AdminPlan) {
    syncMut.mutate(p.id, {
      onSuccess: (updated) => {
        setPlans((arr) => arr.map((x) => (x.id === p.id ? updated : x)));
        toast({
          title: 'Polar synced',
          description: updated.polarProductId
            ? `Product ${updated.polarProductId.slice(0, 12)}…`
            : 'No product (FREE)',
        });
      },
      onError: (e) =>
        toast({ title: 'Sync failed', description: (e as Error).message, variant: 'destructive' }),
    });
  }

  function onSaved(updated: AdminPlan) {
    setPlans((arr) => arr.map((x) => (x.id === updated.id ? updated : x)));
    setEditing(null);
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Plans &amp; Pricing</h1>
        <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
          {plans.filter((p) => p.active).length} ACTIVE · {plans.filter((p) => !p.active).length} ARCHIVED ·{' '}
          {polarConfigured ? 'POLAR CONNECTED' : 'POLAR NOT CONNECTED'}
        </p>
      </div>

      {!polarConfigured && (
        <Card className="mb-4 border-status-amber/40 bg-status-amber/5 p-3">
          <p className="text-[13px] font-medium text-fg">Polar is not configured</p>
          <p className="mt-1 font-mono text-[11px] text-fg-muted">
            Set <code>POLAR_ACCESS_TOKEN</code>, <code>POLAR_SERVER</code>, and{' '}
            <code>POLAR_WEBHOOK_SECRET</code> in <code>apps/api/.env</code>, then restart the API.
            Saving a plan still works — Polar product creation is just skipped until reconnected.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {plans.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {p.tier}
                  </Badge>
                  <span className="text-[15px] font-semibold">{p.name}</span>
                  {!p.active && <Badge variant="secondary">Archived</Badge>}
                  {p.tier !== 'FREE' &&
                    (p.polarProductId ? (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        polar: {p.polarProductId.slice(0, 8)}…
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="font-mono">
                        not synced
                      </Badge>
                    ))}
                </div>
                <p className="mt-1 text-[13px] text-fg-muted">{p.description}</p>
                <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                  ${(p.priceMonthlyCents / 100).toFixed(2)}/mo · $
                  {(p.priceYearlyCents / 100).toFixed(2)}/yr
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setEditing(p)}
                  disabled={busy === p.id}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {p.tier !== 'FREE' && (
                  <Button
                    variant="outline"
                    onClick={() => syncPolar(p)}
                    loading={busy === p.id}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sync to Polar
                  </Button>
                )}
                {p.active ? (
                  <Button
                    variant="ghost"
                    onClick={() => archive(p)}
                    disabled={busy === p.id}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => restore(p)}
                    disabled={busy === p.id}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-2 border-t border-dashed border-border pt-3 md:grid-cols-3">
              <Stat label="Saved searches" value={(p.limits as { savedSearches?: number }).savedSearches ?? 0} />
              <Stat label="Keywords / search" value={(p.limits as { keywordsPerSearch?: number }).keywordsPerSearch ?? 0} />
              <Stat label="Manual runs / mo" value={(p.limits as { manualRunsPerMonth?: number }).manualRunsPerMonth ?? 0} />
            </div>
          </Card>
        ))}
      </div>

      <EditPlanDrawer
        plan={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </div>
      <div className="text-[15px] font-semibold">
        {value === -1 ? '∞' : value}
      </div>
    </div>
  );
}

