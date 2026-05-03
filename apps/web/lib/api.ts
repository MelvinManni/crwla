// Typed fetch client. On the server it uses cookies() for auth; on the
// client it relies on the browser sending the httpOnly cookie via the
// Next.js rewrite to the API.

const API_BASE_CLIENT = process.env.NEXT_PUBLIC_API_URL || '/api';

type ApiOpts = {
  body?: unknown;
  signal?: AbortSignal;
  /** Pass a cookie header (server-side only). */
  cookie?: string;
};

async function call<T>(method: string, path: string, opts: ApiOpts = {}): Promise<T> {
  const isServer = typeof window === 'undefined';
  const base = isServer ? `${process.env.API_URL || 'http://localhost:3001'}/api` : API_BASE_CLIENT;
  const url = `${base}${path}`;

  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.cookie) headers['cookie'] = opts.cookie;

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    cache: 'no-store',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (!res.ok) {
    let msg: string;
    let code: string | undefined;
    try {
      const data = (await res.json()) as {
        error?: string | { message?: string; code?: string };
      };
      if (typeof data.error === 'string') {
        msg = data.error;
      } else {
        msg = data.error?.message ?? `HTTP ${res.status}`;
        code = data.error?.code;
      }
    } catch {
      msg = `HTTP ${res.status}`;
    }
    if (typeof window !== 'undefined' && res.status === 403 && code === 'PLAN_LIMIT_EXCEEDED') {
      const { useStore } = await import('@/lib/store');
      useStore.getState().showUpgradeLimit({ reason: msg });
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, opts?: ApiOpts) => call<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: ApiOpts) => call<T>('POST', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: ApiOpts) => call<T>('PATCH', path, { ...opts, body }),
  delete: <T>(path: string, opts?: ApiOpts) => call<T>('DELETE', path, opts),
};
