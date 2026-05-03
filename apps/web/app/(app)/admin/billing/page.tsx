import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { AdminBillingClient } from './admin-billing-client';
import type { AdminPlansEnvelope } from '@/lib/queries/admin';

export default async function AdminBillingPage() {
  await requireAdmin();
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  const envelope = await api.get<AdminPlansEnvelope>('/admin/billing/plans', { cookie });
  return <AdminBillingClient initialData={envelope} />;
}
