import type { Entitlements } from '@/components/billing/entitlements-provider';
import type { SliceCreator } from '..';

export type EntitlementsSlice = {
  entitlements: Entitlements | null;
  setEntitlements: (e: Entitlements | null) => void;
};

export const createEntitlementsSlice: SliceCreator<EntitlementsSlice> = (set) => ({
  entitlements: null,
  setEntitlements: (entitlements) => set({ entitlements }),
});
