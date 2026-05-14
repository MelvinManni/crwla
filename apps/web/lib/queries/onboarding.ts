'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from './keys';

export type OnboardingFlow = 'FIRST_LOGIN' | 'FIRST_CRAWL';
export type OnboardingStatus = 'PENDING' | 'COMPLETED' | 'DISMISSED';

export type ActiveOnboardingFlow = {
  flow: OnboardingFlow;
  status: OnboardingStatus;
  startedAt: number;
};

/**
 * Returns the set of onboarding flows the user has not yet completed or
 * dismissed. Admins always get an empty list. The server upserts the
 * FIRST_LOGIN row on the first hit, so a fresh non-admin user will see
 * FIRST_LOGIN here right after signing in.
 */
export function useActiveOnboarding() {
  return useQuery({
    queryKey: qk.onboarding.active(),
    queryFn: () => api.get<{ flows: ActiveOnboardingFlow[] }>('/onboarding/active'),
    staleTime: 60_000,
  });
}

export function useDismissOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flow: OnboardingFlow) =>
      api.post<{ ok: true }>(`/onboarding/${flow}/dismiss`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.onboarding.active() });
    },
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flow: OnboardingFlow) =>
      api.post<{ ok: true }>(`/onboarding/${flow}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.onboarding.active() });
    },
  });
}
