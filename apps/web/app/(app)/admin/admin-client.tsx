'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { AccessRequestView, UserAdminView } from '@/lib/types';

export function AdminClient({
  initialRequests,
  initialUsers,
}: {
  initialRequests: AccessRequestView[];
  initialUsers: UserAdminView[];
}) {
  const router = useRouter();
  const search = useSearchParams();
  const initialTab = search.get('tab') === 'members' ? 'members' : 'requests';
  const { toast } = useToast();
  const [requests, setRequests] = useState(initialRequests);
  const [users, setUsers] = useState(initialUsers);
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(id: string) {
    setBusy(id);
    try {
      await api.post(`/admin/requests/${id}/approve`);
      setRequests((r) => r.filter((x) => x.id !== id));
      toast({ title: 'Approved', description: 'Member created.' });
      router.refresh();
    } catch (e) {
      toast({ title: 'Approve failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  async function deny(id: string) {
    setBusy(id);
    try {
      await api.post(`/admin/requests/${id}/deny`);
      setRequests((r) => r.filter((x) => x.id !== id));
      toast({ title: 'Denied' });
    } catch (e) {
      toast({ title: 'Deny failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(u: UserAdminView) {
    setBusy(u.id);
    try {
      await api.patch(`/admin/users/${u.id}`, { active: !u.active });
      setUsers((arr) => arr.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x)));
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  async function changeRole(u: UserAdminView, role: 'admin' | 'member') {
    setBusy(u.id);
    try {
      await api.patch(`/admin/users/${u.id}`, { role });
      setUsers((arr) =>
        arr.map((x) => (x.id === u.id ? { ...x, role: role === 'admin' ? 'Admin' : 'Member' } : x)),
      );
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  async function toggleCategory(u: UserAdminView, category: string) {
    setBusy(u.id);
    const current = u.disabledSourceCategories ?? [];
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    try {
      await api.patch(`/admin/users/${u.id}`, { disabledSourceCategories: next });
      setUsers((arr) =>
        arr.map((x) => (x.id === u.id ? { ...x, disabledSourceCategories: next } : x)),
      );
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
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

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="requests">
            Requests
            {requests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {requests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="members">
            Members
            {users.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {users.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          {requests.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium">{r.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {r.email} · {r.team} · {r.requested}
                      </p>
                      {r.reason && <p className="mt-2 text-sm">{r.reason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy === r.id} onClick={() => approve(r.id)}>
                        {busy === r.id ? <Spinner /> : 'Approve'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => deny(r.id)}>
                        Deny
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <div className="space-y-2">
            {users.map((u) => {
              const denied = u.disabledSourceCategories ?? [];
              return (
                <Card key={u.id} className="flex flex-col gap-3 p-3 px-4">
                  <div className="flex items-start justify-between gap-3">
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === u.id}
                        onClick={() => changeRole(u, u.role === 'Admin' ? 'member' : 'admin')}
                      >
                        {u.role === 'Admin' ? 'Demote' : 'Promote'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === u.id}
                        onClick={() => toggleActive(u)}
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                      Source access
                    </span>
                    {(['news', 'social', 'forums', 'blogs'] as const).map((cat) => {
                      const off = denied.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(u, cat)}
                          disabled={busy === u.id}
                          className={cn(
                            'rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors',
                            off
                              ? 'border-border bg-bg-sunk text-fg-muted line-through'
                              : 'border-fg bg-bg-elev text-fg',
                          )}
                          aria-pressed={!off}
                          title={off ? `Enable ${cat}` : `Disable ${cat}`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
