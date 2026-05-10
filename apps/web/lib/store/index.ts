import { create, type StateCreator } from 'zustand';
import { createAuthSlice, type AuthSlice } from './slices/auth';
import { createEntitlementsSlice, type EntitlementsSlice } from './slices/entitlements';
import { createUiSlice, type UiSlice } from './slices/ui';
export type Store = AuthSlice & EntitlementsSlice & UiSlice;
export const useStore = create<Store>()((...a) => ({
  ...createAuthSlice(...a), ...createEntitlementsSlice(...a), ...createUiSlice(...a),
}));
export type SliceCreator<S> = StateCreator<Store, [], [], S>;
