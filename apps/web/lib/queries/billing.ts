'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from './keys';
import type { Entitlements } from '@/components/billing/entitlements-provider';

export type PlanFeatureView = {
  key: string;
  label: string;
  included: true;
  sortOrder: number;
};

export type PlanView = {
  id: string;
  tier: 'FREE' | 'STARTER' | 'BASIC' | 'PRO' | 'BUSINESS';
  name: string;
  description: string | null;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  features: PlanFeatureView[];
  hasPolar: boolean;
};

export function useBillingPlans(opts?: { initialData?: { plans: PlanView[] } }) {
  return useQuery({
    queryKey: qk.billing.plans(),
    queryFn: () => api.get<{ plans: PlanView[] }>('/billing/plans'),
    initialData: opts?.initialData,
    staleTime: 5 * 60_000,
  });
}

export function useBillingMe(opts?: { initialData?: Entitlements }) {
  return useQuery({
    queryKey: qk.billing.me(),
    queryFn: () => api.get<Entitlements>('/billing/me'),
    initialData: opts?.initialData,
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tier: string; interval: string }) =>
      api.post<{ url: string | null; downgraded?: boolean }>('/billing/checkout', input),
    onSuccess: (out) => {
      // Downgrade-to-Free returns synchronously (no Polar redirect) so the
      // client-side entitlements cache must be invalidated here — otherwise
      // limits/usage panels keep the old plan until a hard reload. For paid
      // upgrades (out.url present), the redirect → Polar → return to
      // `/billing?status=success` re-mounts the SSR'd page; billing-client
      // handles invalidation on that return.
      if (out.downgraded) {
        qc.invalidateQueries({ queryKey: qk.billing.me() });
      }
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: () => api.post<{ url: string | null }>('/billing/portal'),
  });
}

export function useCancelBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/billing/cancel'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.billing.me() });
    },
  });
}
