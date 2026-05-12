// Server-side auth helpers — read the crwla_token cookie and call
// /api/auth/me to validate. Used by the (app) layout and by any server
// component that needs the session.

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api } from './api';
import type { SessionUser } from './types';

const COOKIE_NAME = 'crwla_token';

// Wrapped in `cache()` so the (app) layout + each (app) page calling
// requireSession() collapses into a single /auth/me round-trip per
// request. Was previously firing twice per navigation.
export const getSession = cache(async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const out = await api.get<{ user: SessionUser }>('/auth/me', {
      cookie: `${COOKIE_NAME}=${token}`,
    });
    return out.user ?? null;
  } catch {
    return null;
  }
});

export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect('/signin');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== 'ADMIN') redirect('/dashboard');
  return user;
}
