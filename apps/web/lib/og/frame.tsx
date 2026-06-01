// Shared chrome for every OG card: paper canvas with grain, hairline
// corner brackets, brand row (dot-in-circle logo + tracked wordmark + tag),
// content area, and a foot row (line + footnote + url). Each per-page
// component renders its hero/motif as children inside this frame so the
// suite reads as one family.
//
// Style choices mirror components/metadata/DESIGN_PROMPT.md and the
// "OG Image" handoff design. Keep them in lockstep — if the chrome moves,
// this is the only place that needs to change.
//
// Satori rules in force: no shadows/filters/masks, linear gradients only,
// no pseudo-elements (every dot/inner-circle is a real div). Tracking and
// line-height fall back gracefully because Satori does its own metrics.

import type { ReactNode } from 'react';

const TOKENS = {
  paper: '#f3f1ec',
  paperDeep: '#ebe8df',
  ink: '#0e0e0e',
  ink2: '#2a2a2a',
  muted: '#6e6b63',
  line: '#d8d3c6',
  accent: '#ff5e3a',
  // Hairline border tone — ink at 8%, used for in-card chrome (chips, etc).
  border: 'rgba(14,14,14,0.08)',
} as const;

const FONT_SANS = 'Inter, system-ui, sans-serif';
const FONT_SERIF = 'Instrument Serif, Georgia, serif';
const FONT_MONO = 'JetBrains Mono, ui-monospace, monospace';

const FONTS = {
  sans: FONT_SANS,
  serif: FONT_SERIF,
  mono: FONT_MONO,
} as const;

export function OgFrame({
  caption,
  footnote = '',
  url = 'crwla.com',
  children,
}: {
  /** Top-right tag text — uppercase short phrase, e.g. "PARALLEL SEARCH". */
  caption: string;
  /** Bottom-left mono footnote. Defaults to the studio/city stamp. */
  footnote?: string;
  /** Bottom-right URL. Defaults to the marketing host. */
  url?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        position: 'relative',
        backgroundColor: TOKENS.paper,
        // Subtle grain — 4px cell, 1px dot at 2.5% ink. Satori supports a
        // single repeated radial-gradient as a background image.
        backgroundImage:
          'radial-gradient(rgba(14,14,14,0.025) 1px, transparent 1px)',
        backgroundSize: '4px 4px',
        fontFamily: FONT_SANS,
        color: TOKENS.ink,
      }}
    >
      {/* Hairline corner brackets — 28px L-shapes inset 40px from each edge. */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 28,
          height: 28,
          borderTop: `1.5px solid ${TOKENS.ink}`,
          borderLeft: `1.5px solid ${TOKENS.ink}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 40,
          width: 28,
          height: 28,
          borderTop: `1.5px solid ${TOKENS.ink}`,
          borderRight: `1.5px solid ${TOKENS.ink}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          width: 28,
          height: 28,
          borderBottom: `1.5px solid ${TOKENS.ink}`,
          borderLeft: `1.5px solid ${TOKENS.ink}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          width: 28,
          height: 28,
          borderBottom: `1.5px solid ${TOKENS.ink}`,
          borderRight: `1.5px solid ${TOKENS.ink}`,
        }}
      />

      {/* Content inset — 70px top/bottom, 80px sides. Three rows stacked
          with space-between so brand pins top, foot pins bottom, hero
          centers. */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 80,
          right: 80,
          bottom: 70,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Logo: ink circle with accent inner. */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: TOKENS.ink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: TOKENS.accent,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: '0.1em',
                color: TOKENS.ink,
              }}
            >
              CRWLA
            </div>
          </div>
          {/* Tag (top-right) — accent dot + uppercase mono. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: FONT_MONO,
              fontSize: 13,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: TOKENS.muted,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: TOKENS.accent,
              }}
            />
            <div style={{ display: 'flex' }}>{caption}</div>
          </div>
        </div>

        {/* Hero row — children render here, centered by parent's space-between. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>

        {/* Foot row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: FONT_MONO,
              fontSize: 13,
              letterSpacing: '0.1em',
              color: TOKENS.muted,
            }}
          >
            <div
              style={{
                width: 24,
                height: 1,
                backgroundColor: TOKENS.ink,
                opacity: 0.4,
              }}
            />
            <div style={{ display: 'flex' }}>{footnote}</div>
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: FONT_MONO,
              fontSize: 14,
              letterSpacing: '0.06em',
              color: TOKENS.ink,
              fontWeight: 500,
            }}
          >
            {url}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline italic accent — Instrument Serif in accent orange. Use inside a
 * hero phrase to pick out a word or two:
 *   <DefaultOg title={<>Search <AccentEm>everything,</AccentEm> all at once.</>} />
 */
export function AccentEm({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: FONT_SERIF,
        fontStyle: 'italic',
        fontWeight: 400,
        color: TOKENS.accent,
        letterSpacing: '-0.015em',
      }}
    >
      {children}
    </span>
  );
}

/**
 * Inline italic in muted ink for sub-line emphasis (no accent color).
 */
export function MutedEm({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: FONT_SERIF,
        fontStyle: 'italic',
        fontWeight: 400,
        color: TOKENS.muted,
      }}
    >
      {children}
    </span>
  );
}

export const OG_TOKENS = TOKENS;
export const OG_FONTS = FONTS;
