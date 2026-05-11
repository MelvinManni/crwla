'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-[14px] border border-border bg-bg-elev">
          <Check className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <div className="text-[17px] font-semibold">Request submitted</div>
          <p className="mx-auto mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-fg-muted">
            An admin will review and email you at{' '}
            <span className="font-mono">{email || 'your email'}</span> within 1 business day.
          </p>
        </div>
        <Button
          variant="secondary"
          render={<Link href="/signin" />}
          className="rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
      <div className="mb-6 flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/signin" />}
          className="h-9 w-9 rounded-lg border border-border bg-bg-elev"
          aria-label="Back to sign in"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Request access</h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            We'll route this to an admin. Set the password you'll sign in with.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-[12px] font-medium">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="h-11 rounded-lg bg-bg-elev px-3 text-[14px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-[12px] font-medium">Work email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-11 rounded-lg bg-bg-elev px-3 text-[14px]"
          />
          <span className="font-mono text-[11px] text-fg-muted">
            Must match an approved company domain.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-[12px] font-medium">
            Password <span className="font-mono text-[11px] text-fg-muted">min 8 chars</span>
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11 rounded-lg bg-bg-elev px-3 text-[14px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="team" className="text-[12px] font-medium">Team</Label>
          <Input
            id="team"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="Marketing, Sales, Research…"
            className="h-11 rounded-lg bg-bg-elev px-3 text-[14px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="reason" className="text-[12px] font-medium">
            What will you use it for?
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="One or two sentences helps the admin approve faster."
            className="min-h-[84px] rounded-lg bg-bg-elev px-3 py-2.5 text-[14px] leading-relaxed"
          />
        </div>

        {error && <p className="font-mono text-[11px] text-status-red">{error}</p>}

        <Button
          size="lg"
          className="h-11 w-full rounded-lg bg-fg text-[14px] text-bg-elev hover:bg-fg/90"
          onClick={submit}
          loading={busy}
        >
          Submit request
        </Button>
      </div>
    </div>
  );
}
