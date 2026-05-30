'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from './keys';
import type { SessionUser } from '@/lib/types';

export function useSignin() {
  return useMutation({
    mutationFn: (input: { email: string; password: string; recaptchaToken?: string }) =>
      api.post<{ user: SessionUser }>('/auth/signin', input),
  });
}

export type SignupInput = {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  team?: string;
  recaptchaToken?: string;
};

/**
 * Self-serve signup. The API creates the account, emails a verification link,
 * and signs the user in immediately (cookie set) — but protected routes stay
 * gated until they verify, so callers should send them to /verify-email.
 */
export function useSignup() {
  return useMutation({
    mutationFn: (input: SignupInput) =>
      api.post<{ user: SessionUser; emailVerificationRequired: boolean }>('/auth/signup', input),
  });
}

/** Confirm the emailed token. On success the API refreshes the session cookie. */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (input: { token: string }) =>
      api.post<{ user: SessionUser }>('/auth/verify-email', input),
  });
}

/** Re-send the verification email for the currently signed-in (unverified) user. */
export function useResendVerification() {
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean }>('/auth/resend-verification'),
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
  firstName?: string;
  lastName?: string | null;
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
