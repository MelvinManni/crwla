"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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

type Ctx = {
  /**
   * Show the upgrade modal. Used by `lib/api.ts` when the API replies with
   * 403 + `code: 'PLAN_LIMIT_EXCEEDED'` and by feature components that want
   * to block access to a paid feature pre-emptively.
   */
  showLimit: (input: { reason: string; recommendedTier?: string }) => void;
};

const UpgradeContext = createContext<Ctx | null>(null);

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [recommended, setRecommended] = useState<string | null>(null);

  const showLimit = useCallback<Ctx["showLimit"]>((input) => {
    setReason(input.reason);
    setRecommended(input.recommendedTier ?? null);
    setOpen(true);
  }, []);

  // Bridge the cross-cutting `crwla:plan-limit-exceeded` event so non-React
  // callers (e.g. lib/api.ts) can trigger the modal.
  useEffect(() => {
    function on(e: Event) {
      const d = (e as CustomEvent<UpgradeEventDetail>).detail;
      showLimit({ reason: d.reason, recommendedTier: d.recommendedTier });
    }
    window.addEventListener(UPGRADE_EVENT, on);
    return () => window.removeEventListener(UPGRADE_EVENT, on);
  }, [showLimit]);

  return (
    <UpgradeContext.Provider value={{ showLimit }}>
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Not now
            </Button>
            <Button
              render={<Link href="/billing" />}
              onClick={() => setOpen(false)}
            >
              View plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UpgradeContext.Provider>
  );
}

export function useUpgradeModal(): Ctx {
  const ctx = useContext(UpgradeContext);
  if (!ctx)
    throw new Error(
      "useUpgradeModal must be used inside <UpgradeModalProvider>",
    );
  return ctx;
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
