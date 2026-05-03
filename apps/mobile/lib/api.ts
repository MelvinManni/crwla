import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'crwla_token';
const BASE =
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3001/api';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg: string;
    try {
      const data = (await res.json()) as { error?: string | { message?: string } };
      msg =
        typeof data.error === 'string'
          ? data.error
          : (data.error?.message ?? `HTTP ${res.status}`);
    } catch {
      msg = `HTTP ${res.status}`;
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(p: string) => call<T>('GET', p),
  post: <T>(p: string, b?: unknown) => call<T>('POST', p, b),
  patch: <T>(p: string, b?: unknown) => call<T>('PATCH', p, b),
  delete: <T>(p: string) => call<T>('DELETE', p),
};

export const tokenStore = {
  set: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
