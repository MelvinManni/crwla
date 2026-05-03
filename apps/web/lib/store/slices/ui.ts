import type { SliceCreator } from '..';
export type UiSlice = {
  upgradeOpen: boolean; upgradeReason: string; upgradeRecommended: string | null;
  showUpgradeLimit: (input: { reason: string; recommendedTier?: string }) => void;
  closeUpgrade: () => void;
};
export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  upgradeOpen: false, upgradeReason: '', upgradeRecommended: null,
  showUpgradeLimit: ({ reason, recommendedTier }) => set({ upgradeOpen: true, upgradeReason: reason, upgradeRecommended: recommendedTier ?? null }),
  closeUpgrade: () => set({ upgradeOpen: false }),
});
