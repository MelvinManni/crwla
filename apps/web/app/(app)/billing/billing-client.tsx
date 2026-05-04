'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { Entitlements, PlanView } from '@/lib/types';

type CheckoutResponse = {
  url?: string;
  downgraded?: boolean;
  scheduled?: boolean;
  scheduledFor?: number;
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

export function BillingClient({ mine, plans }: { mine: Entitlements; plans: PlanView[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const pendingChange = mine.pendingChange ?? null;
  const periodEnd = mine.currentPeriodEnd ?? null;
  const onPaidPlanWithActivePeriod =
    mine.tier !== 'FREE' && periodEnd !== null && periodEnd > Date.now();

  function downgradeLabel(target: PlanView): string | null {
    if (target.tier === 'FREE' && onPaidPlanWithActivePeriod) {
      return 'Schedule downgrade to Free';
    }
    if (
      target.interval === 'MONTH' &&
      mine.interval === 'MONTH' &&
      target.priceMonthlyCents < mine.priceMonthlyCents &&
      onPaidPlanWithActivePeriod
    ) {
      return `Schedule downgrade to ${target.name}`;
    }
    return null;
  }

  function buttonLabel(target: PlanView): string {
    if (target.tier === mine.tier && target.interval === mine.interval) return 'Current plan';
    const scheduled = downgradeLabel(target);
    if (scheduled) return scheduled;
    if (target.tier === 'FREE') return 'Downgrade to Free';
    if (target.priceMonthlyCents < mine.priceMonthlyCents) return `Downgrade to ${target.name}`;
    return `Switch to ${target.name}`;
  }

  async function checkout(plan: PlanView) {
    setBusy(plan.id);
    try {
      const out = await api.post<CheckoutResponse>('/billing/checkout', {
        planId: plan.id,
      });
      if (out.scheduled === true) {
        const when = out.scheduledFor ? formatDate(out.scheduledFor) : 'period end';
        toast({ title: `Scheduled for ${when}` });
        router.refresh();
        return;
      }
      if (out.downgraded === true) {
        toast({ title: 'Plan updated' });
        router.refresh();
        return;
      }
      if (out.url) {
        window.location.href = out.url;
        return;
      }
      router.refresh();
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  async function cancelScheduledChange() {
    setBusy('cancel-scheduled');
    try {
      await api.post('/billing/scheduled-change/cancel', {});
      toast({ title: 'Scheduled change canceled' });
      router.refresh();
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          You are on the <strong>{mine.planName}</strong> plan.
        </p>
      </div>

      {pendingChange && (
        <Card className="mb-6 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-medium">Scheduled change</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Switching to <strong>{pendingChange.targetPlanName}</strong> on{' '}
                <strong>{formatDate(pendingChange.scheduledFor)}</strong>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={busy === 'cancel-scheduled'}
              onClick={cancelScheduledChange}
            >
              {busy === 'cancel-scheduled' ? <Spinner /> : 'Cancel scheduled change'}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.tier === mine.tier && plan.interval === mine.interval;
          return (
            <Card key={plan.id} className="flex flex-col p-4">
              <div className="mb-3">
                <h3 className="font-medium">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {plan.interval === 'YEAR' ? 'Billed yearly' : 'Billed monthly'}
                </p>
              </div>
              <p className="mb-4 text-2xl font-semibold tracking-tight">
                ${(plan.priceMonthlyCents / 100).toFixed(2)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  /{plan.interval === 'YEAR' ? 'yr' : 'mo'}
                </span>
              </p>
              <Button
                size="sm"
                variant={isCurrent ? 'outline' : 'default'}
                disabled={isCurrent || busy !== null}
                onClick={() => checkout(plan)}
                className="mt-auto"
              >
                {busy === plan.id ? <Spinner /> : buttonLabel(plan)}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
