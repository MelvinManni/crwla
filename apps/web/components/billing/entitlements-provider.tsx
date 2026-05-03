'use client';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEntitlementsQuery } from '@/lib/queries/billing';
import { qk } from '@/lib/queries/keys';
import { useStore } from '@/lib/store';

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
  cron: ReadonlyArray<'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL' | 'CUSTOM'>;
  allowedSourceCategories: ReadonlyArray<'news' | 'social' | 'forums' | 'blogs'>;
  exportFormats: ReadonlyArray<'csv' | 'xlsx' | 'json' | 'pdf'>;
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
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'UNPAID';
  interval: 'MONTH' | 'YEAR';
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  bonus: {
    extraManualRuns: number;
    extraSms: number;
    extraSeats: number;
  };
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

export function EntitlementsProvider({
  initialData,
  children,
}: {
  initialData?: Entitlements;
  children: ReactNode;
}) {
  useEntitlementsQuery({ initialData });
  return children;
}

export function useEntitlements() {
  const ent = useStore((s) => s.entitlements);
  const queryClient = useQueryClient();
  return {
    ent,
    refresh: () => queryClient.invalidateQueries({ queryKey: qk.billing.me() }),
  };
}

export function PlanLock({
  allowed,
  reason,
  children,
  fallback,
}: {
  allowed: boolean;
  reason?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const showLimit = useStore((s) => s.showUpgradeLimit);
  if (allowed) return children;
  if (fallback !== undefined) return fallback;
  return (
    <button
      type="button"
      onClick={() => showLimit({ reason: reason ?? 'This feature requires a higher plan.' })}
      className="text-sm text-muted-foreground underline"
    >
      Upgrade to unlock
    </button>
  );
}
