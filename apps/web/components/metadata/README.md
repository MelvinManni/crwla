# `components/metadata` — OG card components

One React component per page-OG-image. Each component renders inside Next.js
`ImageResponse` (Satori) at 1200×630.

## Convention

- File name: `<RouteName>Og.tsx` (PascalCase, ends with `Og`).
- Default export: a JSX tree that fits 1200×630 and uses only Satori-safe CSS.
- Props: a single typed object of dynamic slots (default values inline so the
  component still renders cold).
- Static cards live alongside dynamic ones; the distinction is whether the
  caller passes data or accepts defaults.

```tsx
// CrawlDetailOg.tsx
import { OgFrame } from '@/lib/og/frame';
export type CrawlDetailOgProps = {
  name?: string;
  keywordCount?: number;
  resultCount?: number;
  cron?: string;
  lastRun?: string;
};
export default function CrawlDetailOg({
  name = 'Crawl',
  keywordCount = 0,
  resultCount = 0,
  cron = 'DAILY',
  lastRun = 'never',
}: CrawlDetailOgProps) {
  return (
    <OgFrame caption="CRWLA / CRAWLS">
      {/* layout per the design file */}
    </OgFrame>
  );
}
```

## Wiring a route

Each `app/.../page.tsx` gets a sibling `opengraph-image.tsx`:

```tsx
// app/(app)/crawls/[id]/opengraph-image.tsx
import { renderOg } from '@/lib/og/render';
import CrawlDetailOg from '@/components/metadata/CrawlDetailOg';

export const runtime = 'edge';
export const alt = 'CRWLA crawl';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  // Fetch the small payload needed for slots — keep this under 100ms.
  const data = await fetchCrawlForOg(params.id);
  return renderOg(<CrawlDetailOg {...data} />);
}
```

`opengraph-image.tsx` is the Next.js convention — it produces both the
`<meta property="og:image">` tag *and* the actual rendered image at
`/<route>/opengraph-image`. No manual `metadata.openGraph.images` plumbing.

## Why a Stop hook enforces this

Every route gets a card so social previews never fall back to a blank image
on a newly-shipped feature. The `.claude/hooks/check-og-images.sh` Stop
hook (registered in `.claude/settings.local.json`) audits the tree and
blocks a session from ending while any `page.tsx` lacks a sibling
`opengraph-image.tsx`. See HARNESS §3 I-9.

## See also

- `DESIGN_PROMPT.md` — the brief sent to Claude Design for the visual spec.
- `apps/web/lib/og/` — shared render helper, font config, and types.
