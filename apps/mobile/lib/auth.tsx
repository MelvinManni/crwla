import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';

type User = { id: string; email: string; name: string; role: 'ADMIN' | 'MEMBER'; team: string | null };

type Ctx = {
  user: User | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  loading: true,
  signin: async () => {},
  signout: async () => {},
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

  return <AuthCtx.Provider value={{ user, loading, signin, signout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
