'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useBillingPlans,
  useBillingMe,
  useCheckout,
  useBillingPortal,
  useCancelBilling,
  type PlanView,
} from '@/lib/queries/billing';
import type { Entitlements } from '@/components/billing/entitlements-provider';

const fmtMoney = (cents: number) =>
  cents === 0 ? 'Free' : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

export function BillingClient({
  initialPlans,
  initialMine,
}: {
  initialPlans: { plans: PlanView[] };
  initialMine: Entitlements;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const plansQuery = useBillingPlans({ initialData: initialPlans });
  const mineQuery = useBillingMe({ initialData: initialMine });

  const plans = plansQuery.data?.plans ?? initialPlans.plans;
  const mine = mineQuery.data ?? initialMine;

  const [interval, setInterval] = useState<'MONTH' | 'YEAR'>(mine.interval);
  const [pendingTier, setPendingTier] = useState<PlanView['tier'] | null>(null);

  const checkoutMut = useCheckout();
  const portalMut = useBillingPortal();
  const cancelMut = useCancelBilling();

  const busy = checkoutMut.isPending || portalMut.isPending || cancelMut.isPending;

  function checkout(tier: PlanView['tier']) {
    setPendingTier(tier);
    checkoutMut.mutate(
      { tier, interval },
      {
        onSuccess: (out) => {
          if (out.url) {
            window.location.href = out.url;
          } else if (out.downgraded) {
            toast({ title: 'Downgraded to Free' });
            router.refresh();
          }
        },
        onError: (e) => {
          toast({
            title: 'Checkout failed',
            description: (e as Error).message,
            variant: 'destructive',
          });
        },
        onSettled: () => setPendingTier(null),
      },
    );
  }

  function openPortal() {
    portalMut.mutate(undefined, {
      onSuccess: (out) => {
        if (out.url) window.open(out.url, '_blank');
        else toast({ title: 'No customer portal yet — buy a plan first' });
      },
      onError: (e) => {
        toast({
          title: 'Portal failed',
          description: (e as Error).message,
          variant: 'destructive',
        });
      },
    });
  }

  function cancel() {
    if (!confirm('Cancel at the end of the current period?')) return;
    cancelMut.mutate(undefined, {
      onSuccess: () => {
        toast({ title: 'Cancellation scheduled' });
        router.refresh();
      },
      onError: (e) => {
        toast({
          title: 'Cancel failed',
          description: (e as Error).message,
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Billing</h1>
        <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
          {mine.plan.name.toUpperCase()} · {mine.status} · {mine.interval.toLowerCase()}ly
          {mine.currentPeriodEnd
            ? ` · renews ${new Date(mine.currentPeriodEnd).toLocaleDateString()}`
            : ''}
          {mine.cancelAtPeriodEnd ? ' · CANCELING' : ''}
        </p>
      </div>

      <Card className="mb-6 rounded-[10px] p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Manual runs" value={mine.usage.manualRuns} bonus={mine.bonus.extraManualRuns} />
          <Stat label="Scheduled runs" value={mine.usage.scheduledRuns} />
          <Stat label="Email alerts" value={mine.usage.emailAlerts} />
          <Stat label="SMS alerts" value={mine.usage.smsAlerts} bonus={mine.bonus.extraSms} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
          <Button size="sm" variant="outline" onClick={openPortal} disabled={busy} loading={portalMut.isPending}>
            <ExternalLink className="h-3.5 w-3.5" />
            Manage on Polar
          </Button>
          {mine.plan.tier !== 'FREE' && !mine.cancelAtPeriodEnd && (
            <Button size="sm" variant="ghost" onClick={cancel} disabled={busy}>
              Cancel at period end
            </Button>
          )}
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] text-fg-subtle">Plans</span>
        <div className="inline-flex rounded-lg border border-border bg-bg-elev p-0.5">
          {(['MONTH', 'YEAR'] as const).map((i) => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={cn(
                'rounded-md px-3 py-1 font-mono text-[11px] transition-colors',
                interval === i ? 'bg-bg-sunk text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {i === 'MONTH' ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const cents = interval === 'YEAR' ? p.priceYearlyCents : p.priceMonthlyCents;
          const current = p.tier === mine.plan.tier;
          return (
            <Card
              key={p.id}
              className={cn(
                'flex flex-col rounded-[10px] p-5',
                current ? 'border-fg shadow-[0_0_0_3px_rgba(0,0,0,0.04)]' : '',
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[15px] font-semibold">{p.name}</div>
                  <div className="mt-0.5 text-[12px] text-fg-muted">{p.description}</div>
                </div>
                {current && (
                  <span className="rounded border border-fg px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-[26px] font-semibold tracking-tight">{fmtMoney(cents)}</span>
                {cents > 0 && (
                  <span className="font-mono text-[11px] text-fg-muted">
                    /{interval === 'YEAR' ? 'year' : 'mo'}
                  </span>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-fg">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-fg-muted" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {current ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => checkout(p.tier)}
                    disabled={busy || (!p.hasPolar && p.tier !== 'FREE')}
                  >
                    {checkoutMut.isPending && pendingTier === p.tier ? (
                      <Spinner />
                    ) : p.tier === 'FREE' ? (
                      'Downgrade to Free'
                    ) : !p.hasPolar ? (
                      'Coming soon'
                    ) : (
                      `Upgrade to ${p.name}`
                    )}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, bonus }: { label: string; value: number; bonus?: number }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">{label}</div>
      <div className="mt-1 text-[18px] font-semibold tracking-tight">{value}</div>
      {bonus !== undefined && bonus > 0 && (
        <div className="font-mono text-[10px] text-fg-muted">+{bonus} bonus</div>
      )}
    </div>
  );
}
