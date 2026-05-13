'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from './keys';
import type { SessionUser } from '@/lib/types';

export function useSignin() {
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ user: SessionUser }>('/auth/signin', input),
  });
}

export function useSignout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/signout'),
    onSuccess: () => {
      qc.clear();
    },
  });
}

export type RequestAccessInput = {
  name: string;
  email: string;
  password: string;
  team: string;
  reason: string;
};

export function useRequestAccess() {
  return useMutation({
    mutationFn: (input: RequestAccessInput) => api.post<void>('/auth/request-access', input),
  });
}

export function useMe(opts?: { initialData?: SessionUser }) {
  return useQuery({
    queryKey: qk.auth.me(),
    queryFn: () => api.get<{ user: SessionUser }>('/auth/me').then((r) => r.user),
    initialData: opts?.initialData,
    staleTime: 60_000,
  });
}

export type UpdateProfileInput = {
  name?: string;
  email?: string;
  team?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api.patch<{ user: SessionUser }>('/auth/me', input).then((r) => r.user),
    onSuccess: (user) => {
      qc.setQueryData(qk.auth.me(), user);
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<void>('/auth/me'),
    onSuccess: () => {
      qc.clear();
    },
  });
}
