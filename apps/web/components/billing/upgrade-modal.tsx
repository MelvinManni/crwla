'use client';
import type { ReactNode } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const open = useStore((s) => s.upgradeOpen);
  const reason = useStore((s) => s.upgradeReason);
  const recommended = useStore((s) => s.upgradeRecommended);
  const close = useStore((s) => s.closeUpgrade);

  return (
    <>
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={close}
        >
          <div
            className="rounded-lg border bg-background p-6 shadow-lg max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">Upgrade required</h2>
            <p className="text-sm text-muted-foreground mb-4">{reason}</p>
            {recommended ? (
              <p className="text-sm mb-4">
                Recommended plan: <strong>{recommended}</strong>
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>
                Dismiss
              </Button>
              <Button asChild>
                <a href="/billing">View plans</a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function useUpgradeModal() {
  return { showLimit: useStore((s) => s.showUpgradeLimit) };
}
