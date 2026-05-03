import { create, type StateCreator } from 'zustand';
import { createAuthSlice, type AuthSlice } from './slices/auth';
import { createUiSlice, type UiSlice } from './slices/ui';

export type Store = AuthSlice & UiSlice;

export const useStore = create<Store>()((...a) => ({
  ...createAuthSlice(...a),
  ...createUiSlice(...a),
}));

export type SliceCreator<S> = StateCreator<Store, [], [], S>;
