import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import type { Entitlements } from '@/components/billing/entitlements-provider';
import type { PlanView } from '@/lib/queries/billing';
import { BillingClient } from './billing-client';

export default async function BillingPage() {
  await requireSession();
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  const [plansRes, mineRes] = await Promise.all([
    api.get<{ plans: PlanView[] }>('/billing/plans', { cookie }),
    api.get<Entitlements>('/billing/me', { cookie }),
  ]);

  return <BillingClient initialPlans={plansRes} initialMine={mineRes} />;
}
