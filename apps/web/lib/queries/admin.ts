'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from './keys';
import type { AccessRequestView, UserAdminView } from '@/lib/types';
import type { AdminPlan } from '@/app/(app)/admin/billing/admin-billing-client';

// ---------- Access requests ----------

export function useAccessRequests(opts?: {
  initialData?: { requests: AccessRequestView[] };
}) {
  return useQuery({
    queryKey: qk.admin.requests(),
    queryFn: () => api.get<{ requests: AccessRequestView[] }>('/admin/requests'),
    initialData: opts?.initialData,
    staleTime: 30_000,
  });
}

export function useApproveAccessRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/admin/requests/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.requests() });
      qc.invalidateQueries({ queryKey: qk.admin.users() });
    },
  });
}

export function useDenyAccessRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/admin/requests/${id}/deny`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.requests() });
    },
  });
}

// ---------- Admin users ----------

export function useAdminUsers(opts?: { initialData?: { users: UserAdminView[] } }) {
  return useQuery({
    queryKey: qk.admin.users(),
    queryFn: () => api.get<{ users: UserAdminView[] }>('/admin/users'),
    initialData: opts?.initialData,
    staleTime: 30_000,
  });
}

export type UpdateAdminUserInput = {
  id: string;
  active?: boolean;
  role?: 'admin' | 'member';
  disabledSourceCategories?: string[];
};

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateAdminUserInput) =>
      api.patch<void>(`/admin/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.users() });
    },
  });
}

// ---------- Admin billing plans ----------

export function useArchivePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<AdminPlan>(`/admin/billing/plans/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.billingPlans() });
      qc.invalidateQueries({ queryKey: qk.billing.plans() });
    },
  });
}

export function useRestorePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<AdminPlan>(`/admin/billing/plans/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.billingPlans() });
      qc.invalidateQueries({ queryKey: qk.billing.plans() });
    },
  });
}

export function useSyncPlanToPolar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<AdminPlan>(`/admin/billing/plans/${id}/sync-polar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.billingPlans() });
    },
  });
}

export type SavePlanInput = {
  id: string;
  name: string;
  description: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  features: string[];
  limits: Record<string, unknown>;
};

export type SavePlanResponse = AdminPlan & { polarSyncError?: string };

export function useSavePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: SavePlanInput) =>
      api.patch<SavePlanResponse>(`/admin/billing/plans/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.billingPlans() });
      qc.invalidateQueries({ queryKey: qk.billing.plans() });
    },
  });
}
