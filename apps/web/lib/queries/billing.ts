'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from './keys';
import type { Entitlements } from '@/components/billing/entitlements-provider';

export type PlanView = {
  id: string;
  tier: 'FREE' | 'STARTER' | 'BASIC' | 'PRO' | 'BUSINESS';
  name: string;
  description: string | null;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  features: string[];
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
  return useMutation({
    mutationFn: (input: { tier: string; interval: string }) =>
      api.post<{ url: string | null; downgraded?: boolean }>('/billing/checkout', input),
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
