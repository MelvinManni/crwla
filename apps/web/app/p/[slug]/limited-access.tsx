import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Shown when /p/<slug> resolves to nothing — either the slug doesn't
 * exist, the owner revoked public access, or the search was deleted. We
 * intentionally do not distinguish between those cases to avoid leaking
 * slug existence.
 */
export function LimitedAccessPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
      <Card className="w-full p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-sunk">
          <Lock className="h-5 w-5 text-fg-muted" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Limited access
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          You don&apos;t have access to view this shared crawl. The owner may
          have revoked the link, or it may have been deleted.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button render={<Link href="/" />} variant="outline">
            Go to homepage
          </Button>
          <Button render={<Link href="/signin" />} variant="ghost">
            Sign in
          </Button>
        </div>
      </Card>
    </div>
  );
}
