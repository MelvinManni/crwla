// Shared placeholder OG card. Every `opengraph-image.tsx` currently
// imports this with a per-route caption/title/subtitle. A per-page
// component (CrawlDetailOg, SharedCrawlOg, etc.) can replace the import
// without touching opengraph-image.tsx unless the prop shape changes.
//
// Typography and palette mirror the "OG Image" handoff design — paper
// canvas, sans hero with optional Instrument-Serif italic accent
// (<AccentEm>), and a mono eyebrow.

import { OG_FONTS, OG_TOKENS, OgFrame } from '@/lib/og/frame';
import type { ReactNode } from 'react';

export type DefaultOgProps = {
  /** Top-right mono tag, e.g. "PARALLEL SEARCH" or "CRAWLS". */
  caption: string;
  /** Hero phrase. Keep to ≤6 words / 2 lines. Accepts a ReactNode so the
   *  caller can drop an <AccentEm> fragment inline. */
  title: ReactNode;
  /** Optional mono eyebrow above the title, e.g. "— INTRODUCING". */
  eyebrow?: string;
  /** Optional sub-line beneath the title, ≤90 chars. */
  subtitle?: ReactNode;
};

export default function DefaultOg({
  caption,
  title,
  eyebrow,
  subtitle,
}: DefaultOgProps) {
  return (
    <OgFrame caption={caption}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          maxWidth: 940,
        }}
      >
        {eyebrow ? (
          <div
            style={{
              display: 'flex',
              fontFamily: OG_FONTS.mono,
              fontSize: 13,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: OG_TOKENS.muted,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            fontFamily: OG_FONTS.sans,
            fontWeight: 600,
            fontSize: 86,
            lineHeight: 0.96,
            letterSpacing: '-0.035em',
            color: OG_TOKENS.ink,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: 'flex',
              fontFamily: OG_FONTS.sans,
              fontSize: 22,
              lineHeight: 1.45,
              color: OG_TOKENS.ink2,
              maxWidth: 720,
              fontWeight: 400,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </OgFrame>
  );
}
