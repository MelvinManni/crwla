// Canonical site origin for SEO metadata. Mirrors the canonical-host redirect
// in middleware.ts (dev.crwla.com → crwla.com). Override locally/per-env with
// NEXT_PUBLIC_SITE_URL when previewing on another origin.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://crwla.com'
).replace(/\/$/, '');

export const SITE_NAME = 'CRWLA';

/** Build an absolute URL for a given path on the canonical origin. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
