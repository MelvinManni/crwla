'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { api } from '@/lib/api';
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
  const [ent, setEnt] = useState<Entitlements | null>(null);

  async function load() {
    try {
      const out = await api.get<Entitlements>('/billing/me');
      setEnt(out);
    } catch {
      // fail-soft: page still works, lock badges just won't render
    }
  }

  useEffect(() => {
    load();
  }, []);

  return <Ctx.Provider value={{ ent, refresh: load }}>{children}</Ctx.Provider>;
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
