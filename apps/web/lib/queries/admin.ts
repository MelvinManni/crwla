'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from './keys';

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
  features: string[];
  active: boolean;
  sortOrder: number;
};

export type AdminPlansEnvelope = {
  plans: AdminPlan[];
  polar: { configured: boolean };
};

export function useAdminPlans(opts?: { initialData?: AdminPlansEnvelope }) {
  return useQuery({
    queryKey: qk.admin.billingPlans(),
    queryFn: () => api.get<AdminPlansEnvelope>('/admin/billing/plans'),
    initialData: opts?.initialData,
  });
}

export function useArchivePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<AdminPlan>(`/admin/billing/plans/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.billingPlans() });
    },
  });
}

export function useRestorePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<AdminPlan>(`/admin/billing/plans/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.billingPlans() });
    },
  });
}

export function useSyncPolar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<AdminPlan>(`/admin/billing/plans/${id}/sync-polar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.billingPlans() });
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AdminPlan> }) =>
      api.patch<AdminPlan & { polarSyncError?: string }>(`/admin/billing/plans/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.billingPlans() });
    },
  });
}
