// Shared chrome for every OG card: outer canvas, dotted-grid background,
// wordmark, mono caption, and the safe-area gutter. Each per-page
// component renders its motif as children inside this frame so the suite
// reads as one family.
//
// Style choices here mirror the design brief in
// components/metadata/DESIGN_PROMPT.md. Keep them in lockstep — if the
// designer changes the gutter or the caption position, this is the only
// place that needs to move.

import type { ReactNode } from 'react';

const TOKENS = {
  bg: '#FAFAFA',
  bgElev: '#FFFFFF',
  fg: '#0A0A0A',
  fgMuted: '#737373',
  fgSubtle: '#A3A3A3',
  border: 'rgba(10,10,10,0.08)',
};

export function OgFrame({
  caption,
  children,
}: {
  /** Mono caption shown top-right, e.g. "CRWLA / DASHBOARD". */
  caption: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        padding: 50,
        backgroundColor: TOKENS.bg,
        // Faint dotted grid — built with a radial-gradient repeat so Satori
        // doesn't need a mask. 24px cell, 1.5px dot.
        backgroundImage:
          'radial-gradient(circle at 0 0, rgba(10,10,10,0.06) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        color: TOKENS.fg,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          CRWLA
        </div>
        <div
          style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 13,
            letterSpacing: '0.08em',
            color: TOKENS.fgSubtle,
          }}
        >
          {caption}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          marginTop: 32,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const OG_TOKENS = TOKENS;
