// Same rules as the web client (apps/web/.../results-client.tsx): we don't
// want Google's news-carousel CDNs or the `s2/favicons` proxy bubbling up
// as a result thumbnail. When the stored image is Google-served or missing
// we fall back to the article site's own favicon via DuckDuckGo's free
// icon service.

const GOOGLE_THUMB_HOSTS =
  /(^|\.)google\.com$|(^|\.)gstatic\.com$|(^|\.)googleusercontent\.com$/i;

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isGoogleThumb(url: string): boolean {
  const h = hostnameOf(url);
  return !!h && GOOGLE_THUMB_HOSTS.test(h);
}

export function siteFavicon(articleUrl: string): string | null {
  const h = hostnameOf(articleUrl);
  return h ? `https://icons.duckduckgo.com/ip3/${h}.ico` : null;
}

export type Thumb =
  | { kind: 'cover'; src: string }
  | { kind: 'site'; src: string }
  | { kind: 'none' };

export function pickThumbnail(input: { image: string | null; url: string }): Thumb {
  if (input.image && !isGoogleThumb(input.image)) {
    return { kind: 'cover', src: input.image };
  }
  const fav = siteFavicon(input.url);
  return fav ? { kind: 'site', src: fav } : { kind: 'none' };
}
