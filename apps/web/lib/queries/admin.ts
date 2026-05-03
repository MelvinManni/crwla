'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AccessRequestView, UserAdminView } from '@/lib/types';
import { qk } from './keys';

export function useAdminRequests(opts?: { initialData?: { requests: AccessRequestView[] } }) {
  return useQuery({
    queryKey: qk.admin.requests(),
    queryFn: () => api.get<{ requests: AccessRequestView[] }>('/admin/requests'),
    initialData: opts?.initialData,
  });
}

export function useAdminUsers(opts?: { initialData?: { users: UserAdminView[] } }) {
  return useQuery({
    queryKey: qk.admin.users(),
    queryFn: () => api.get<{ users: UserAdminView[] }>('/admin/users'),
    initialData: opts?.initialData,
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/admin/requests/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.requests() });
      qc.invalidateQueries({ queryKey: qk.admin.users() });
    },
  });
}

export function useDenyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/admin/requests/${id}/deny`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.requests() });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{ active: boolean; role: string; disabledSourceCategories: string[] }>;
    }) => api.patch<UserAdminView>(`/admin/users/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.admin.users() });
    },
  });
}
