import type { ListParams } from '@/lib/list-state';
export const qk = {
  searches: {
    list: (p: ListParams) => ['searches', 'list', p] as const,
    detail: (id: string) => ['searches', 'detail', id] as const,
    results: (id: string, p: ListParams) => ['searches', 'results', id, p] as const,
    sources: () => ['sources'] as const,
  },
  alerts: { list: (p: ListParams) => ['alerts', 'list', p] as const },
  admin: {
    requests: () => ['admin', 'requests'] as const,
    users: () => ['admin', 'users'] as const,
    billingPlans: () => ['admin', 'billing', 'plans'] as const,
  },
  billing: { me: () => ['billing', 'me'] as const, plans: () => ['billing', 'plans'] as const },
  auth: { me: () => ['auth', 'me'] as const },
} as const;
