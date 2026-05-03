'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { AccessRequestView, UserAdminView } from '@/lib/types';

export function AdminClient({
  initialRequests,
  initialUsers,
}: {
  initialRequests: AccessRequestView[];
  initialUsers: UserAdminView[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'requests' | 'members'>('requests');
  const [requests, setRequests] = useState(initialRequests);
  const [users, setUsers] = useState(initialUsers);
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(id: string) {
    setBusy(id);
    try {
      await api.post(`/admin/requests/${id}/approve`);
      setRequests((r) => r.filter((x) => x.id !== id));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }
  async function deny(id: string) {
    setBusy(id);
    try {
      await api.post(`/admin/requests/${id}/deny`);
      setRequests((r) => r.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }
  async function toggleActive(u: UserAdminView) {
    setBusy(u.id);
    try {
      await api.patch(`/admin/users/${u.id}`, { active: !u.active });
      setUsers((arr) => arr.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Access requests and members.</p>
      </div>

      <div className="mb-4 inline-flex rounded-md border border-border p-1">
        <Button
          variant={tab === 'requests' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('requests')}
        >
          Requests {requests.length > 0 && <Badge variant="secondary">{requests.length}</Badge>}
        </Button>
        <Button
          variant={tab === 'members' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('members')}
        >
          Members {users.length > 0 && <Badge variant="secondary">{users.length}</Badge>}
        </Button>
      </div>

      {tab === 'requests' &&
        (requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.email} · {r.team} · {r.requested}</p>
                    {r.reason && <p className="mt-2 text-sm">{r.reason}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy === r.id} onClick={() => approve(r.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => deny(r.id)}>
                      Deny
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === 'members' && (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="flex items-center justify-between p-3 px-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  <Badge variant={u.role === 'Admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                  {!u.active && <Badge variant="destructive">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {u.email} · {u.team} · last active {u.last}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === u.id}
                onClick={() => toggleActive(u)}
              >
                {u.active ? 'Deactivate' : 'Activate'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
