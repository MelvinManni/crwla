'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  useAdminRequests,
  useAdminUsers,
  useApproveRequest,
  useDenyRequest,
  useUpdateUser,
} from '@/lib/queries/admin';
import type { AccessRequestView, UserAdminView } from '@/lib/types';

export function AdminClient({
  initialRequests,
  initialUsers,
}: {
  initialRequests: { requests: AccessRequestView[] };
  initialUsers: { users: UserAdminView[] };
}) {
  const [tab, setTab] = useState<'requests' | 'members'>('requests');
  const { data: requestsData } = useAdminRequests({ initialData: initialRequests });
  const { data: usersData } = useAdminUsers({ initialData: initialUsers });
  const requests = requestsData?.requests ?? [];
  const users = usersData?.users ?? [];

  const approve = useApproveRequest();
  const deny = useDenyRequest();
  const update = useUpdateUser();

  const onError = (err: unknown) =>
    toast({
      variant: 'destructive',
      title: 'Action failed',
      description: err instanceof Error ? err.message : 'Unknown error',
    });

  const busyId =
    (approve.isPending && approve.variables) ||
    (deny.isPending && deny.variables) ||
    (update.isPending && update.variables?.id) ||
    null;

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
                    <Button
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => approve.mutate(r.id, { onError })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => deny.mutate(r.id, { onError })}
                    >
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
                disabled={busyId === u.id}
                onClick={() =>
                  update.mutate(
                    { id: u.id, patch: { active: !u.active } },
                    { onError },
                  )
                }
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
