import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import type { Entitlements, PlanView } from '@/lib/types';
import { BillingClient } from './billing-client';

export default async function BillingPage() {
  await requireSession();
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  const [me, plans] = await Promise.all([
    api.get<{ mine: Entitlements }>('/billing/me', { cookie }),
    api.get<{ plans: PlanView[] }>('/billing/plans', { cookie }),
  ]);

  return <BillingClient mine={me.mine} plans={plans.plans} />;
}
