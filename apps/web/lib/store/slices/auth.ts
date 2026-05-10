import type { SessionUser } from '@/lib/types';
import type { SliceCreator } from '..';
export type AuthSlice = { user: SessionUser | null; setUser: (u: SessionUser | null) => void; clearUser: () => void };
export const createAuthSlice: SliceCreator<AuthSlice> = (set) => ({
  user: null, setUser: (user) => set({ user }), clearUser: () => set({ user: null }),
});
