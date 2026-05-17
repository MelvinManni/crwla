// Thin wrapper around Next's `ImageResponse` so every OG card renders with
// the same canvas size, content-type, and (eventually) font set.
//
// Kept deliberately small — page-level `opengraph-image.tsx` files do the
// data-fetching, then hand a finished React tree to `renderOg`. That keeps
// each OG endpoint single-purpose and easy to reason about.

import { ImageResponse } from 'next/og';
import type { ReactElement } from 'react';

export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * Render an OG card to a PNG response. Pass through caching headers so
 * social-network crawlers and our own CDN can hold onto the image
 * aggressively — these are content-addressed by the route + params,
 * so a long max-age is safe.
 */
export function renderOg(node: ReactElement): ImageResponse {
  return new ImageResponse(node, {
    ...OG_SIZE,
    headers: {
      // 1 hour fresh, 1 day stale-while-revalidate. Crawlers that ignore
      // these still get the latest on miss; humans rarely hot-reload an OG.
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
