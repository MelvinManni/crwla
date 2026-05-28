'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type FeatureKey =
  | 'pricing_crawla'
  | 'job_search'
  | 'webhooks'
  | 'result_sharing'
  | 'api_access'
  | 'custom_email_domain'
  | 'scheduled_exports'
  | 'location_search'
  | 'smart_filtering'
  | 'keyword_generator'
  | 'shared_searches'
  | 'rbac';

export type FeatureCheck = {
  key: FeatureKey;
  allowed: boolean;
  reason: string | null;
  label: string;
  requiresLabel: string;
  quotaUsed: number | null;
  quotaCap: number | null;
};

export type FeatureAccessResponse = {
  keys: FeatureKey[];
  access: Record<FeatureKey, FeatureCheck>;
};

const ACCESS_KEY = ['features', 'access'] as const;

/**
 * Single read of the user's feature-access map. Driven by the live DB
 * `plan.limits` JSON via the backend `FeatureAccessService`. Use this
 * (not `ent.limits.X` directly) so any change to the registry on the
 * server flows to the FE without code edits here.
 */
export function useFeatureAccess() {
  return useQuery({
    queryKey: ACCESS_KEY,
    queryFn: () => api.get<FeatureAccessResponse>('/features/access'),
    staleTime: 60_000,
  });
}

/**
 * Convenience for the common "is this feature unlocked?" case. Returns
 * `{ allowed, check }` so the caller can also render the registered
 * `label` / `requiresLabel` / quota state without a second lookup.
 */
export function useFeature(key: FeatureKey): {
  allowed: boolean;
  check: FeatureCheck | null;
  loading: boolean;
} {
  const { data, isLoading } = useFeatureAccess();
  if (!data) return { allowed: false, check: null, loading: isLoading };
  const check = data.access[key] ?? null;
  return { allowed: check?.allowed ?? false, check, loading: false };
}
