'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { AccessRequestView, UserAdminView } from '@/lib/types';
import { RequestDetailDrawer } from './request-detail-drawer';
import { MemberDetailDrawer } from './member-detail-drawer';

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
  const [openRequest, setOpenRequest] = useState<AccessRequestView | null>(null);
  const [openMember, setOpenMember] = useState<UserAdminView | null>(null);

  async function approve(id: string) {
    setBusy(id);
    try {
      await api.post(`/admin/requests/${id}/approve`);
      setRequests((r) => r.filter((x) => x.id !== id));
      setOpenRequest((cur) => (cur?.id === id ? null : cur));
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
      setOpenRequest((cur) => (cur?.id === id ? null : cur));
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
      const next = { ...u, active: !u.active };
      setUsers((arr) => arr.map((x) => (x.id === u.id ? next : x)));
      setOpenMember((cur) => (cur?.id === u.id ? next : cur));
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
      const next: UserAdminView = { ...u, role: role === 'admin' ? 'Admin' : 'Member' };
      setUsers((arr) => arr.map((x) => (x.id === u.id ? next : x)));
      setOpenMember((cur) => (cur?.id === u.id ? next : cur));
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  async function toggleCategory(u: UserAdminView, category: string) {
    setBusy(u.id);
    const current = u.disabledSourceCategories ?? [];
    const nextCats = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    try {
      await api.patch(`/admin/users/${u.id}`, { disabledSourceCategories: nextCats });
      const next = { ...u, disabledSourceCategories: nextCats };
      setUsers((arr) => arr.map((x) => (x.id === u.id ? next : x)));
      setOpenMember((cur) => (cur?.id === u.id ? next : cur));
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
                <Card
                  key={r.id}
                  className="cursor-pointer p-4 transition-colors hover:bg-accent/50"
                  onClick={() => setOpenRequest(r)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenRequest(r);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium">{r.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {r.email} · {r.team} · {r.requested}
                      </p>
                      {r.reason && <p className="mt-2 text-sm">{r.reason}</p>}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" loading={busy === r.id} onClick={() => approve(r.id)}>
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
          )}
        </TabsContent>

        <TabsContent value="members">
          <div className="space-y-2">
            {users.map((u) => {
              const denied = u.disabledSourceCategories ?? [];
              return (
                <Card
                  key={u.id}
                  className="flex cursor-pointer flex-col gap-3 p-3 px-4 transition-colors hover:bg-accent/50"
                  onClick={() => setOpenMember(u)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenMember(u);
                    }
                  }}
                >
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
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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

                  <div
                    className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
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

      <RequestDetailDrawer
        request={openRequest}
        onOpenChange={(open) => !open && setOpenRequest(null)}
        onApprove={approve}
        onDeny={deny}
        busy={openRequest ? busy === openRequest.id : false}
      />

      <MemberDetailDrawer
        member={openMember}
        onOpenChange={(open) => !open && setOpenMember(null)}
        onToggleActive={toggleActive}
        onChangeRole={changeRole}
        onToggleCategory={toggleCategory}
        busy={openMember ? busy === openMember.id : false}
      />
    </div>
  );
}
