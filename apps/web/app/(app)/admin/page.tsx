import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import type { AccessRequestView, UserAdminView } from '@/lib/types';
import { AdminClient } from './admin-client';

export default async function AdminPage() {
  await requireAdmin();
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  const [reqs, users] = await Promise.all([
    api.get<{ requests: AccessRequestView[] }>('/admin/requests', { cookie }),
    api.get<{ users: UserAdminView[] }>('/admin/users', { cookie }),
  ]);

  return <AdminClient initialRequests={reqs} initialUsers={users} />;
}
