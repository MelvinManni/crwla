import Link from 'next/link';
import { BellOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * One-click "pause digest" landing page reached from the digest email. The
 * token in the query string is a signed crawl reference — no session needed.
 * Hitting this page performs the toggle (POST) server-side and renders a
 * simple confirmation; a bad/forged token shows an invalid-link card.
 */
export default async function DigestUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : '';

  let crawlName: string | null = null;
  if (token) {
    try {
      const out = await api.post<{ ok: true; crawlName: string }>(
        '/digest/unsubscribe',
        { token },
      );
      crawlName = out.crawlName;
    } catch {
      crawlName = null;
    }
  }

  if (!crawlName) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <Card className="w-full p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-sunk">
            <Lock className="h-5 w-5 text-fg-muted" aria-hidden />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            Invalid link
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            This pause-digest link is invalid or has expired. You can manage
            digests from the crawl&apos;s settings instead.
          </p>
          <div className="mt-6">
            <Button render={<Link href="/dashboard" />} variant="outline">
              Go to dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
      <Card className="w-full p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-sunk">
          <BellOff className="h-5 w-5 text-fg-muted" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Digest paused
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          You&apos;ll no longer get digest emails for{' '}
          <strong className="text-fg">{crawlName}</strong>. Turn them back on
          anytime from the crawl&apos;s settings.
        </p>
        <div className="mt-6">
          <Button render={<Link href="/dashboard" />} variant="outline">
            Go to dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
