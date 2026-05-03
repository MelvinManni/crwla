'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import type { SessionUser } from '@/lib/types';
export function AuthHydrator({ user }: { user: SessionUser }) {
  useEffect(() => { useStore.getState().setUser(user); }, [user]);
  return null;
}
