'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { useBillingMe } from '@/lib/queries/billing';
import { qk } from '@/lib/queries/keys';
import { cn } from '@/lib/utils';

export type PlanLimits = {
  savedSearches: number;
  keywordsPerSearch: number;
  bulkKeywordImport: number;
  manualRunsPerMonth: number;
  scheduledRunsPerSearchPerMonth: number;
  emailAlerts: number;
  smsAlertsPerMonth: number;
  whatsappAlertsPerMonth: number;
  resultHistoryDays: number;
  cron: string[];
  allowedSourceCategories: string[];
  exportFormats: string[];
  webhooks: boolean;
  apiAccess: boolean;
  customEmailDomain: boolean;
  scheduledExports: boolean;
  resultSharing: boolean;
  teamSeats: number;
  prioritySupport: boolean;
  uptimeSLA: boolean;
};

export type Entitlements = {
  plan: { id: string; tier: string; name: string };
  status: string;
  interval: 'MONTH' | 'YEAR';
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  bonus: { extraManualRuns: number; extraSms: number; extraSeats: number };
  usage: {
    period: string;
    manualRuns: number;
    scheduledRuns: number;
    emailAlerts: number;
    smsAlerts: number;
    whatsappAlerts: number;
    csvExports: number;
  };
};

const Ctx = createContext<{ ent: Entitlements | null; refresh: () => void }>({
  ent: null,
  refresh: () => {},
});

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  // Fail-soft: if the request errors (eg. user just signed out) we surface
  // ent=null so lock badges just don't render — same behavior as before.
  const { data } = useBillingMe();

  const value = useMemo(
    () => ({
      ent: data ?? null,
      refresh: () => {
        qc.invalidateQueries({ queryKey: qk.billing.me() });
      },
    }),
    [data, qc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements() {
  return useContext(Ctx);
}

/**
 * Renders a small "Pro" lock badge inline. Pass `unlocked` to hide it once
 * the user is on a high-enough tier:
 *   <PlanLock unlocked={limits.webhooks} requires="Pro" />
 */
export function PlanLock({
  unlocked,
  requires,
  className,
}: {
  unlocked: boolean;
  requires: string;
  className?: string;
}) {
  if (unlocked) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border border-border bg-bg-sunk px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted',
        className,
      )}
    >
      <Lock className="h-2.5 w-2.5" />
      {requires}
    </span>
  );
}
