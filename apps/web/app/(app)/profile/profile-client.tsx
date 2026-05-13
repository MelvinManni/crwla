'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDeleteAccount, useMe, useUpdateProfile } from '@/lib/queries/auth';
import type { SessionUser } from '@/lib/types';

export function ProfileClient({ initialUser }: { initialUser: SessionUser }) {
  const { toast } = useToast();
  const { data: user } = useMe({ initialData: initialUser });
  const me = user ?? initialUser;
  const updateMut = useUpdateProfile();
  const deleteMut = useDeleteAccount();

  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [team, setTeam] = useState(me.team ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);

    // Only ship changed fields to the API. Avoids re-validating identical
    // values and lets the user save a single-field edit without re-typing
    // the rest.
    const patch: Parameters<typeof updateMut.mutate>[0] = {};
    if (name.trim() && name.trim() !== me.name) patch.name = name.trim();
    if (email.trim() && email.trim() !== me.email) patch.email = email.trim();
    const nextTeam = team.trim() === '' ? null : team.trim();
    if (nextTeam !== (me.team ?? null)) patch.team = nextTeam;
    if (newPassword) {
      patch.newPassword = newPassword;
      patch.currentPassword = currentPassword;
    }

    if (Object.keys(patch).length === 0) {
      toast({ title: 'Nothing to update' });
      return;
    }

    updateMut.mutate(patch, {
      onSuccess: () => {
        setCurrentPassword('');
        setNewPassword('');
        toast({ title: 'Profile saved' });
      },
      onError: (e) => setError((e as Error).message),
    });
  }

  function deleteAccount() {
    deleteMut.mutate(undefined, {
      onSuccess: () => {
        // Hard nav so the cleared cookie + cache and the middleware all
        // get to a clean state. Same trick we use after signin.
        window.location.assign('/signin');
      },
      onError: (e) =>
        toast({
          title: 'Delete failed',
          description: (e as Error).message,
          variant: 'destructive',
        }),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Profile</h1>
        <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
          {me.role} · {me.email}
        </p>
      </div>

      <Card className="rounded-[10px] p-5">
        <h2 className="text-[15px] font-semibold">Account</h2>
        <p className="mt-0.5 text-[12px] text-fg-muted">
          Changes save immediately. Email must be unique.
        </p>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-team">Team</Label>
            <Input
              id="profile-team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="(optional)"
            />
          </div>
        </div>

        <div className="mt-6 border-t border-dashed border-border pt-5">
          <h3 className="text-[13px] font-medium">Change password</h3>
          <p className="mt-0.5 text-[12px] text-fg-muted">
            Leave blank to keep your current password.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-current-password">Current password</Label>
              <Input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-new-password">New password</Label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 font-mono text-[12px] text-status-red">{error}</p>
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={save} loading={updateMut.isPending}>
            Save changes
          </Button>
        </div>
      </Card>

      <Card className="mt-6 rounded-[10px] border-destructive/30 bg-destructive/5 p-5">
        <h2 className="text-[15px] font-semibold text-destructive">Danger zone</h2>
        <p className="mt-0.5 text-[12px] text-fg-muted">
          Soft-deletes your account. Your data is retained but you'll no longer be able to
          sign in. Contact an admin to restore.
        </p>

        <div className="mt-4">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" disabled={deleteMut.isPending} />
              }
            >
              Delete account
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This signs you out and prevents future sign-ins. Saved crawls, alerts,
                  and billing history are kept for audit, but you won't see them again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount}>
                  {deleteMut.isPending ? 'Deleting…' : 'Delete account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  );
}
