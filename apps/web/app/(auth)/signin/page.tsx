'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useSignin } from '@/lib/queries/auth';

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const signin = useSignin();

  async function submit() {
    if (!email || !password) {
      setError('email and password required');
      return;
    }
    setError(null);
    try {
      await signin.mutateAsync({ email, password });
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-sm">
          CR
        </div>
        <div>
          <h1 className="text-xl font-semibold">Sign in to CRWLA</h1>
          <p className="text-sm text-muted-foreground">
            Internal research tool. Access is granted by an admin.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" size="lg" onClick={submit} disabled={signin.isPending}>
          {signin.isPending ? <Spinner /> : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account yet?{' '}
          <Link href="/request-access" className="font-medium text-foreground underline-offset-4 hover:underline">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
