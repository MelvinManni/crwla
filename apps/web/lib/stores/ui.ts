import { create } from 'zustand';

/**
 * Pure-UI stores that used to live behind React context providers. The
 * providers (StartCrawlProvider, UpgradeModalProvider) still mount the
 * dialogs and run side effects (URL ?new=1 detection, window-event bridge),
 * but the shared state lives here so:
 *   - non-React callers (lib/api.ts) can fire actions without a window
 *     CustomEvent round-trip.
 *   - re-render scope is per-selector instead of "the whole provider
 *     subtree" — useStartCrawlStore((s) => s.open) is stable across renders.
 */

type StartCrawlState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openModal: () => void;
  closeModal: () => void;
};

export const useStartCrawlStore = create<StartCrawlState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  openModal: () => set({ open: true }),
  closeModal: () => set({ open: false }),
}));

type UpgradeInput = { reason: string; recommendedTier?: string };

type UpgradeState = {
  open: boolean;
  reason: string;
  recommendedTier: string | null;
  setOpen: (open: boolean) => void;
  showLimit: (input: UpgradeInput) => void;
  close: () => void;
};

export const useUpgradeStore = create<UpgradeState>((set) => ({
  open: false,
  reason: '',
  recommendedTier: null,
  setOpen: (open) => set({ open }),
  showLimit: ({ reason, recommendedTier }) =>
    set({ open: true, reason, recommendedTier: recommendedTier ?? null }),
  close: () => set({ open: false }),
}));
