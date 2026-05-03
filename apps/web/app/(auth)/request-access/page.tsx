'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

export default function RequestAccessPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [team, setTeam] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!name || !email || !password) {
      setError('name, email, and password required');
      return;
    }
    if (password.length < 8) {
      setError('password must be at least 8 characters');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.post('/auth/request-access', { name, email, password, team, reason });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <h1 className="text-xl font-semibold">Request submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We'll let an admin know. You'll be able to sign in once they approve you.
        </p>
        <Link href="/signin" className="mt-6 text-sm font-medium underline-offset-4 hover:underline">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Request access</h1>
        <p className="text-sm text-muted-foreground">
          We'll route this to an admin. Set the password you'll sign in with.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password (min 8 chars)</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team">Team</Label>
          <Input id="team" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="optional" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reason">Why do you need access?</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="optional"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" size="lg" onClick={submit} disabled={busy}>
          {busy ? <Spinner /> : 'Request access'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/signin" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
