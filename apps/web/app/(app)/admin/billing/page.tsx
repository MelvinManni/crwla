import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { AdminBillingClient, type AdminPlan } from './admin-billing-client';

type Out = {
  plans: AdminPlan[];
  polar: { configured: boolean };
};

export default async function AdminBillingPage() {
  await requireAdmin();
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  const out = await api.get<Out>('/admin/billing/plans', { cookie });
  return (
    <AdminBillingClient
      initialPlans={out.plans}
      polarConfigured={out.polar.configured}
    />
  );
}
