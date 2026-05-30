import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: 'ADMIN' | 'MEMBER';
  team: string | null;
};

export type UpdateProfileInput = {
  firstName?: string;
  lastName?: string | null;
  email?: string;
  team?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signout: () => Promise<void>;
  /** PATCH /auth/me — partial profile update. Returns the latest user. */
  updateProfile: (input: UpdateProfileInput) => Promise<User>;
  /** DELETE /auth/me — soft-deletes and clears local session. */
  deleteAccount: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  loading: true,
  signin: async () => {},
  signout: async () => {},
  updateProfile: async () => {
    throw new Error('AuthProvider missing');
  },
  deleteAccount: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await tokenStore.get();
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        // /auth/me now returns 401 for soft-deleted accounts — drop the
        // stale token so the user lands on signin instead of looping.
        const out = await api.get<{ user: User }>('/auth/me');
        setUser(out.user);
      } catch {
        await tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signin(email: string, password: string) {
    const out = await api.post<{ token: string; user: User }>('/auth/signin', { email, password });
    await tokenStore.set(out.token);
    setUser(out.user);
  }

  async function signout() {
    try {
      await api.post('/auth/signout');
    } catch {}
    await tokenStore.clear();
    setUser(null);
  }

  async function updateProfile(input: UpdateProfileInput): Promise<User> {
    const out = await api.patch<{ user: User }>('/auth/me', input);
    setUser(out.user);
    return out.user;
  }

  async function deleteAccount() {
    try {
      await api.delete('/auth/me');
    } finally {
      // Even if the request errored after partial deletion, clear local
      // state so the UI doesn't keep a phantom session.
      await tokenStore.clear();
      setUser(null);
    }
  }

  return (
    <AuthCtx.Provider value={{ user, loading, signin, signout, updateProfile, deleteAccount }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
