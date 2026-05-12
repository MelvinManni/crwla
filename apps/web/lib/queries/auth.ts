'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
