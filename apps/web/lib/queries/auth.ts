'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import type { SessionUser } from '@/lib/types';

export function useSignin() {
  const setUser = useStore((s) => s.setUser);
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ user: SessionUser }>('/auth/signin', input),
    onSuccess: (data) => {
      setUser(data.user);
    },
  });
}

export function useRequestAccess() {
  return useMutation({
    mutationFn: (input: {
      name: string;
      email: string;
      password: string;
      team: string;
      reason: string;
    }) => api.post<void>('/auth/request-access', input),
  });
}

export function useSignout() {
  const qc = useQueryClient();
  const clearUser = useStore((s) => s.clearUser);
  return useMutation({
    mutationFn: () => api.post<void>('/auth/signout'),
    onSettled: () => {
      clearUser();
      qc.clear();
    },
  });
}
