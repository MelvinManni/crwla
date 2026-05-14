"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpgradeStore } from "@/lib/stores/ui";

/**
 * Show the upgrade modal. Used by `lib/api.ts` (via the window event below)
 * when the API replies with 403 + `code: 'PLAN_LIMIT_EXCEEDED'`, and by
 * feature components that want to block access to a paid feature
 * pre-emptively. Identical shape to the old context API.
 */
export function useUpgradeModal() {
  const showLimit = useUpgradeStore((s) => s.showLimit);
  return { showLimit };
}

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const open = useUpgradeStore((s) => s.open);
  const setOpen = useUpgradeStore((s) => s.setOpen);
  const close = useUpgradeStore((s) => s.close);
  const reason = useUpgradeStore((s) => s.reason);
  const recommended = useUpgradeStore((s) => s.recommendedTier);

  // Bridge the cross-cutting `crwla:plan-limit-exceeded` event so non-React
  // callers (e.g. lib/api.ts) can trigger the modal without importing the
  // store directly.
  useEffect(() => {
    function on(e: Event) {
      const d = (e as CustomEvent<UpgradeEventDetail>).detail;
      useUpgradeStore.getState().showLimit({
        reason: d.reason,
        recommendedTier: d.recommendedTier,
      });
    }
    window.addEventListener(UPGRADE_EVENT, on);
    return () => window.removeEventListener(UPGRADE_EVENT, on);
  }, []);

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-bg-sunk">
              <Sparkles className="h-5 w-5" />
            </div>
            <DialogTitle>Plan limit reached</DialogTitle>
            <DialogDescription>{reason}</DialogDescription>
          </DialogHeader>
          {recommended && (
            <p className="font-mono text-[11px] text-fg-subtle">
              Recommended: <span className="text-fg">{recommended}</span>
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Not now
            </Button>
            <Button render={<Link href="/billing" />} onClick={close}>
              View plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Top-level event so non-React callers (lib/api.ts) can fire the modal. */
export const UPGRADE_EVENT = "crwla:plan-limit-exceeded";
export type UpgradeEventDetail = { reason: string; recommendedTier?: string };

export function dispatchUpgrade(detail: UpgradeEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<UpgradeEventDetail>(UPGRADE_EVENT, { detail }),
  );
}
