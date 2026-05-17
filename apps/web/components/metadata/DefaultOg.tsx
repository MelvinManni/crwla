// Shared placeholder OG card. Every `opengraph-image.tsx` currently
// imports this with a per-route caption/title/subtitle. Step 2 will swap
// the import in each route to a designed per-page component
// (CrawlDetailOg, SharedCrawlOg, etc.) — no opengraph-image.tsx changes
// needed unless the prop shape changes.

import { OG_TOKENS, OgFrame } from '@/lib/og/frame';

export type DefaultOgProps = {
  /** Top-right mono caption, e.g. "CRWLA / DASHBOARD". */
  caption: string;
  /** Hero phrase. Keep to ≤6 words / 2 lines. */
  title: string;
  /** One optional sub-line under the hero. ≤90 chars. */
  subtitle?: string;
};

export default function DefaultOg({
  caption,
  title,
  subtitle,
}: DefaultOgProps) {
  return (
    <OgFrame caption={caption}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 84,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            fontWeight: 600,
            maxWidth: 1000,
            color: OG_TOKENS.fg,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: 'flex',
              marginTop: 24,
              fontSize: 24,
              color: OG_TOKENS.fgMuted,
              maxWidth: 900,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </OgFrame>
  );
}
