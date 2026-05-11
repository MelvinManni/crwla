'use client';

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

const KEYWORD_SETS = [
  ['Dangote cement Q3', 'BUA cement pricing', 'African infrastructure', 'Lafarge Nigeria news', 'cement industry forecast'],
  ['Mistral Series B', 'Anysphere valuation', 'Glean enterprise AI', 'Sakana AI Tokyo', 'Hume voice models'],
  ['Lagos vendor prices', 'procurement Kano', 'supplier Ibadan', 'wholesale Abuja', 'logistics Port Harcourt'],
];

const SOURCES = [
  { key: 'web', name: 'Web', glyph: 'W' },
  { key: 'x', name: 'X / social', glyph: 'X' },
  { key: 'news', name: 'News', glyph: 'N' },
  { key: 'blogs', name: 'Blogs', glyph: 'B' },
] as const;

type SourceKey = (typeof SOURCES)[number]['key'];

const RESULT_POOL: Record<SourceKey, string[]> = {
  web: [
    'Industry analysts forecast 8% YoY growth in regional output',
    'New plant commissioning announcement — Q4 schedule',
    'Sector overview: capacity, exports, and outlook',
    'Comparative pricing across West Africa markets',
  ],
  x: [
    '@analyst: spotted a 6% bump after the announcement…',
    'Thread on cement margins vs raw input costs',
    'Reuters wire — pricing change confirmed',
    'Quick take on competitive positioning',
  ],
  news: [
    'Punch reports earnings beat on volume gains',
    'Vanguard: Q2 results came in above guidance',
    'BusinessDay covers regulatory commentary',
    'Bloomberg: regional player nears 50% share',
  ],
  blogs: [
    'Investor memo: post-results breakdown',
    'Operator notes — supply chain in 2026',
    'Pricing strategy deep-dive from sector lead',
    'Three things changed this quarter',
  ],
};

const KW_PILL_CLS =
  'inline-flex items-center gap-1.5 px-2 py-0.5 bg-mk-chalk border border-mk-line-strong rounded-[5px] text-mk-ink text-xs font-jetbrains animate-mk-kw-in';

function ScribbleUnderline({ delay = 0 }: { delay?: number }) {
  return (
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -left-1 -right-1 -bottom-2.5 w-[calc(100%+8px)] h-3.5 text-mk-accent"
    >
      <path
        d="M 2 9 C 30 4, 60 12, 90 7 S 150 11, 198 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          strokeDasharray: 400,
          strokeDashoffset: 400,
          animation: `mk-draw-in 1.2s ease-out ${delay}s forwards`,
        }}
      />
    </svg>
  );
}

function HeroDoodleArrow() {
  return (
    <svg viewBox="0 0 90 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M 4 8 C 20 4, 40 14, 56 28 C 64 36, 70 44, 82 50" />
      <path d="M 76 44 L 82 50 L 76 56" />
      <text x="6" y="36" fontFamily="var(--font-instrument-serif), Georgia, serif" fontStyle="italic" fontSize="12" fill="currentColor" stroke="none">
        paste here
      </text>
    </svg>
  );
}

function HeroDoodleStar() {
  return (
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M 40 14 L 44 36 L 66 40 L 44 44 L 40 66 L 36 44 L 14 40 L 36 36 Z" />
      <circle cx="40" cy="40" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HeroDemo() {
  const [setIndex, setSetIndex] = useState(0);
  const [visible, setVisible] = useState(0);
  const [laneItems, setLaneItems] = useState<Record<SourceKey, string[]>>({ web: [], x: [], news: [], blogs: [] });
  const tickRef = useRef(0);

  const keywords = KEYWORD_SETS[setIndex];

  useEffect(() => {
    let cancelled = false;
    setLaneItems({ web: [], x: [], news: [], blogs: [] });
    setVisible(0);

    const pasteInterval = setInterval(() => {
      if (cancelled) return;
      setVisible((v) => {
        if (v < keywords.length) return v + 1;
        clearInterval(pasteInterval);
        return v;
      });
    }, 180);

    const start = setTimeout(() => {
      if (cancelled) return;
      let count = 0;
      const fillInterval = setInterval(() => {
        if (cancelled) {
          clearInterval(fillInterval);
          return;
        }
        tickRef.current++;
        setLaneItems((prev) => {
          const next: Record<SourceKey, string[]> = { ...prev };
          SOURCES.forEach((s, i) => {
            if ((prev[s.key] || []).length < 3 && Math.random() > 0.25 + i * 0.1) {
              const pool = RESULT_POOL[s.key];
              const item = pool[(tickRef.current + i) % pool.length];
              next[s.key] = [...(prev[s.key] || []), item];
            }
          });
          return next;
        });
        count++;
        if (count > 22) clearInterval(fillInterval);
      }, 280);
    }, keywords.length * 200 + 200);

    const cycle = setTimeout(() => {
      if (!cancelled) setSetIndex((i) => (i + 1) % KEYWORD_SETS.length);
    }, 9000);

    return () => {
      cancelled = true;
      clearInterval(pasteInterval);
      clearTimeout(start);
      clearTimeout(cycle);
    };
  }, [setIndex, keywords.length]);

  return (
    <div className="relative bg-mk-chalk border border-mk-line-strong rounded-[18px] p-[18px] flex flex-col gap-3.5 h-[520px] shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_24px_-12px_rgba(0,0,0,0.08)] max-[600px]:p-3.5 max-[600px]:rounded-xl">
      <div className="flex items-center gap-2 pb-3 border-b border-dashed border-mk-line">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-[9px] h-[9px] rounded-full bg-mk-line-strong" />
          ))}
        </div>
        <span className="ml-1.5 font-jetbrains text-[11px] text-mk-muted">crwla.app — new search</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-jetbrains text-[10px] text-mk-leaf uppercase tracking-[0.08em]">
          <span className="w-1.5 h-1.5 rounded-full bg-mk-leaf animate-mk-livedot" />
          Live
        </span>
      </div>

      <div className="bg-mk-paper border border-mk-line rounded-[10px] px-3 py-2.5 font-jetbrains text-[12.5px] leading-[1.8] min-h-[84px] flex flex-wrap gap-1.5 content-start max-[600px]:min-h-[90px] max-[600px]:p-3">
        {keywords.slice(0, visible).map((k, i) => (
          <span key={`${setIndex}-${i}`} className={KW_PILL_CLS}>
            {k}
          </span>
        ))}
        {visible < keywords.length && (
          <span className="inline-block w-px h-3.5 bg-mk-ink align-middle animate-mk-blink" />
        )}
      </div>

      <div className="flex justify-between items-center font-jetbrains text-[10px] text-mk-muted -mt-1">
        <span>
          <span className="text-mk-ink">{visible}</span> keywords · 4 sources · all locations
        </span>
        <span>⌘↵ to run</span>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-2 min-h-0 max-[600px]:grid-cols-2 max-[380px]:grid-cols-1">
        {SOURCES.map((s) => (
          <div key={s.key} className="bg-mk-paper border border-mk-line rounded-lg p-2 flex flex-col gap-1.5 min-w-0 overflow-hidden max-[600px]:p-2.5 max-[600px]:min-h-[110px]">
            <div className="flex items-center justify-between font-jetbrains text-[9.5px] text-mk-muted uppercase tracking-[0.06em]">
              <span className="inline-flex items-center gap-1.5 text-mk-ink font-medium max-[600px]:text-[10px]">
                <span className="w-3.5 h-3.5 rounded-[3px] bg-mk-ink grid place-items-center text-mk-chalk text-[8px]">
                  {s.glyph}
                </span>
                {s.name}
              </span>
              <span className="text-mk-leaf font-medium">+{(laneItems[s.key] || []).length}</span>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
              {(laneItems[s.key] || []).map((item, i) => (
                <div key={`${setIndex}-${s.key}-${i}`} className="flex gap-1.5 items-start text-[10.5px] leading-[1.3] animate-mk-lane-in">
                  <div className="w-4 h-4 rounded-[3px] flex-shrink-0 border border-mk-line bg-mk-paper-deep mt-px [background-image:repeating-linear-gradient(45deg,#c4beaf_0_1px,transparent_1px_5px)] max-[600px]:w-[22px] max-[600px]:h-[22px]" />
                  <div className="flex-1 min-w-0 line-clamp-2 text-mk-ink-2 max-[600px]:text-[11px]">{item}</div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 3 - (laneItems[s.key] || []).length) }).map((_, i) => (
                <div key={`sk-${i}`} className="flex gap-1.5 items-start text-[10.5px] leading-[1.3] animate-mk-lane-in">
                  <div className="w-4 h-4 rounded-[3px] flex-shrink-0 border border-mk-line bg-mk-paper-deep mt-px [background-image:repeating-linear-gradient(45deg,#c4beaf_0_1px,transparent_1px_5px)] max-[600px]:w-[22px] max-[600px]:h-[22px]" />
                  <div className="flex-1 min-w-0 h-2 rounded-sm w-4/5 text-transparent bg-[linear-gradient(90deg,#ebe8df_0%,#d8d3c6_50%,#ebe8df_100%)] bg-[length:200%_100%] animate-mk-shimmer" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', f);
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <nav
      className={[
        'sticky top-0 z-[100] backdrop-blur-md bg-mk-paper/70 border-b transition-colors',
        scrolled ? 'border-mk-line' : 'border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto w-full max-w-[1240px] px-8 max-[700px]:px-5 flex items-center justify-between h-16 gap-6 max-[900px]:h-14 max-[900px]:gap-3">
        <a className="flex items-center gap-2.5 font-space font-bold tracking-[0.06em] text-base text-mk-ink" href="#top">
          <span className="relative w-[22px] h-[22px] rounded-full bg-mk-ink overflow-hidden after:content-[''] after:absolute after:inset-1 after:rounded-full after:bg-mk-accent after:animate-mk-orbit" />
          CRWLA
        </a>
        <div className="flex gap-7 text-sm text-mk-ink-2 max-[800px]:hidden max-[600px]:hidden">
          <a className="relative py-1 hover:text-mk-accent" href="#how">
            How it works
          </a>
          <a className="relative py-1 hover:text-mk-accent" href="/about">
            About
          </a>
          <a className="relative py-1 hover:text-mk-accent" href="/contact">
            Contact
          </a>
        </div>
        <div className="flex gap-3 items-center">
          <a className="text-sm text-mk-ink-2 hover:text-mk-accent max-[900px]:hidden" href="/signin">
            Sign in
          </a>
          <a
            className="inline-flex items-center gap-2 h-[42px] px-[18px] rounded-full font-medium text-sm font-space border border-transparent bg-mk-ink text-mk-chalk transition-transform duration-150 hover:-translate-y-px hover:bg-mk-accent max-[900px]:h-[38px] max-[900px]:px-3.5 max-[900px]:text-[13px]"
            href="#cta"
          >
            Start crawling <span className="transition-transform">→</span>
          </a>
        </div>
      </div>
    </nav>
  );
}

const BTN_BASE =
  'inline-flex items-center gap-2 h-[42px] px-[18px] rounded-full font-medium text-sm font-space border transition-all duration-150 hover:-translate-y-px';
const BTN_PRIMARY = `${BTN_BASE} border-transparent bg-mk-ink text-mk-chalk hover:bg-mk-accent`;
const BTN_GHOST = `${BTN_BASE} bg-transparent border-mk-ink text-mk-ink hover:bg-mk-ink hover:text-mk-chalk`;
const BTN_LG = 'h-[52px] px-6 text-[15px] max-[900px]:h-[46px] max-[900px]:px-[18px] max-[900px]:text-sm';

function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2.5 font-jetbrains text-[11px] tracking-[0.18em] uppercase text-mk-muted ${className}`}>
      {children}
    </div>
  );
}

function Pin() {
  return <span className="w-1.5 h-1.5 rounded-full bg-mk-accent animate-mk-ping" />;
}

function Hero() {
  return (
    <section className="pt-20 pb-[120px] relative max-[800px]:pt-14 max-[800px]:pb-20 max-[600px]:pt-10 max-[600px]:pb-[60px]" id="top">
      <div className="mx-auto w-full max-w-[1240px] px-8 max-[700px]:px-5 grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-16 items-center max-[980px]:grid-cols-1 max-[980px]:gap-12 max-[900px]:gap-10">
        <div className="flex flex-col gap-6">
          <Eyebrow>
            <Pin />
            Parallel search aggregator
          </Eyebrow>
          <h1 className="m-0 font-space font-semibold text-[clamp(36px,7vw,84px)] leading-[0.96] tracking-[-0.035em] text-balance text-mk-ink max-[900px]:text-[clamp(36px,11vw,60px)]">
            Search <em className="font-instrument italic font-normal tracking-[-0.01em]">everything,</em>
            <br />
            <span className="relative inline-block whitespace-nowrap">
              all at once.
              <ScribbleUnderline delay={0.6} />
            </span>
          </h1>
          <p className="text-[clamp(16px,1.4vw,19px)] leading-[1.55] text-mk-muted max-w-[56ch] m-0 max-[900px]:text-base">
            Paste hundreds of keywords. Watch them land in one live dashboard.{' '}
            <em className="font-instrument italic text-[1.05em] text-mk-ink-2">No more 80 open tabs.</em>
          </p>
          <div className="flex gap-3 flex-wrap mt-1 max-[900px]:flex-wrap">
            <a className={`${BTN_PRIMARY} ${BTN_LG}`} href="#cta">
              Start a search <span>→</span>
            </a>
            <a className={`${BTN_GHOST} ${BTN_LG}`} href="#how">
              See how
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -left-8 top-[60px] w-[90px] h-[60px] text-mk-ink-2 opacity-60 max-[900px]:hidden">
            <HeroDoodleArrow />
          </div>
          <div className="absolute -right-1.5 -top-7 w-20 h-20 text-mk-accent max-[900px]:hidden">
            <HeroDoodleStar />
          </div>
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}

function HowRow({
  num,
  title,
  body,
  visual,
  reverse,
}: {
  num: string;
  title: ReactNode;
  body: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={[
        'grid grid-cols-2 gap-20 items-center transition-all duration-[900ms] ease-out max-[900px]:grid-cols-1 max-[900px]:gap-6',
        reverse ? 'direction-rtl' : '',
        seen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7',
      ].join(' ')}
      style={reverse ? { direction: 'rtl' } : undefined}
    >
      <div className="[direction:ltr] flex flex-col">
        <div className="font-jetbrains text-[11px] text-mk-accent tracking-[0.16em]">— {num}</div>
        <h3 className="font-space font-semibold text-[clamp(24px,2.6vw,34px)] leading-[1.05] tracking-[-0.025em] m-0 my-3.5 max-[900px]:text-[clamp(22px,6vw,28px)] [&_em]:font-instrument [&_em]:italic [&_em]:font-normal">
          {title}
        </h3>
        <p className="text-[16.5px] leading-[1.6] text-mk-muted max-w-[44ch] m-0">{body}</p>
      </div>
      <div className="relative min-h-[240px] [direction:ltr] max-[900px]:min-h-0">{visual}</div>
    </div>
  );
}

function ParallelLanes() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 600);
    return () => clearInterval(i);
  }, []);
  const lanes = ['WEB', 'SOCIAL', 'NEWS', 'BLOGS'];
  const fillColor = ['bg-mk-ink', 'bg-mk-accent', 'bg-mk-leaf', 'bg-mk-ink-2'];
  return (
    <div className="flex flex-col gap-[18px] py-7 px-8 max-[600px]:p-[18px] bg-mk-chalk border border-mk-line rounded-[14px] shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_24px_-12px_rgba(0,0,0,0.08)]">
      {lanes.map((l, i) => (
        <div key={l} className="flex flex-col gap-1.5">
          <div className="font-jetbrains text-[10px] tracking-[0.16em] text-mk-muted">{l}</div>
          <div className="h-1 bg-mk-line rounded-sm overflow-hidden">
            <div
              className={`h-full transition-[width] duration-[550ms] ease-out ${fillColor[i]}`}
              style={{ width: `${Math.min(100, ((tick + i * 2) * 12) % 110)}%` }}
            />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, j) => {
              const on = (tick + i + j) % 4 < 2;
              return (
                <span
                  key={j}
                  className={[
                    'w-[5px] h-[5px] rounded-full transition-all duration-300',
                    on ? 'bg-mk-accent scale-[1.3]' : 'bg-mk-line',
                  ].join(' ')}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function UnifiedDash() {
  const items = [
    { t: 'Punch — earnings beat on volume', src: 'news' },
    { t: '@analyst thread on margins', src: 'social' },
    { t: 'Investor memo: post-results', src: 'blog' },
    { t: 'Bloomberg pricing wire', src: 'news' },
  ];
  return (
    <div className="bg-mk-chalk border border-mk-line rounded-[14px] pt-[18px] pb-1.5 overflow-hidden shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_24px_-12px_rgba(0,0,0,0.08)]">
      <div className="flex justify-between px-[22px] pb-3 font-jetbrains text-[10px] tracking-[0.16em] text-mk-muted border-b border-mk-line max-[600px]:px-4 max-[600px]:pb-2.5">
        <span>RESULT</span>
        <span>SRC</span>
      </div>
      {items.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[32px_1fr_auto] gap-3 items-center px-[22px] py-3.5 border-b border-mk-line last:border-b-0 text-[13px] opacity-0 translate-y-2 animate-mk-row-in max-[600px]:grid-cols-[24px_1fr_auto] max-[600px]:px-4 max-[600px]:py-[11px] max-[600px]:text-xs"
          style={{ animationDelay: `${0.2 + i * 0.12}s` } as CSSProperties}
        >
          <div className="w-7 h-7 rounded-md bg-[linear-gradient(135deg,#ebe8df,#d8d3c6)] max-[600px]:w-[22px] max-[600px]:h-[22px]" />
          <span className="overflow-hidden whitespace-nowrap text-ellipsis text-mk-ink">{r.t}</span>
          <span className="font-jetbrains text-[9.5px] tracking-[0.12em] uppercase text-mk-muted px-2 py-[3px] border border-mk-line rounded-full max-[600px]:text-[8.5px] max-[600px]:px-1.5 max-[600px]:py-0.5">
            {r.src}
          </span>
        </div>
      ))}
    </div>
  );
}

function How() {
  return (
    <section className="py-24 relative border-t border-mk-line max-[900px]:py-[70px] max-[700px]:py-16" id="how">
      <div className="mx-auto w-full max-w-[1240px] px-8 max-[700px]:px-5">
        <Eyebrow className="justify-center w-full !flex">
          <Pin />
          How it works
          <Pin />
        </Eyebrow>
        <h2 className="font-space font-semibold text-[clamp(28px,4.4vw,50px)] leading-[1.02] tracking-[-0.03em] text-balance mt-4.5 text-center max-w-[20ch] mx-auto text-mk-ink max-[900px]:text-[clamp(26px,7vw,38px)] [&_em]:font-instrument [&_em]:italic [&_em]:font-normal">
          Three steps. <em>One dashboard.</em>
        </h2>
        <div className="flex flex-col gap-[140px] mt-24 max-[900px]:gap-[84px] max-[900px]:mt-[60px]">
          <HowRow
            num="01"
            title={
              <>
                Paste your <em>keywords</em>
              </>
            }
            body="Drop five or five hundred. Comma, newline, one-at-a-time. Boolean groups and quoted phrases too."
            visual={
              <div className="flex flex-wrap gap-2 p-6 bg-mk-chalk border border-mk-line rounded-[14px] shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_24px_-12px_rgba(0,0,0,0.08)] max-[600px]:p-[18px]">
                {['Dangote', 'BUA cement', 'Lafarge Q3', 'sector outlook', 'export volume', 'Punch news', '+38'].map((k, i) => (
                  <span
                    key={i}
                    className={KW_PILL_CLS}
                    style={{ animationDelay: `${0.1 + i * 0.08}s` } as CSSProperties}
                  >
                    {k}
                  </span>
                ))}
              </div>
            }
          />
          <HowRow
            reverse
            num="02"
            title={
              <>
                Crawl in <em>parallel</em>
              </>
            }
            body="Every source runs its own lane — search engines, X, news wires, company blogs. No queueing."
            visual={<ParallelLanes />}
          />
          <HowRow
            num="03"
            title={
              <>
                Unified <em>live view</em>
              </>
            }
            body="Filter, cluster, save, summarize, or share with your team — without leaving CRWLA."
            visual={<UnifiedDash />}
          />
        </div>
      </div>
    </section>
  );
}

function Highlights() {
  const items = [
    { k: 'Bulk input', v: 'Paste hundreds at once' },
    { k: 'Clusters', v: 'Duplicates collapse, expand on demand' },
    { k: 'Boolean', v: '( BUA OR Dangote ) AND cement NOT Lagos' },
    { k: 'Monitor', v: '"12 last week, 34 this week."' },
    { k: 'Teams', v: 'Assign, comment, share, log' },
  ];
  return (
    <section className="py-24 relative border-t border-mk-line max-[900px]:py-[60px]" id="highlights">
      <div className="mx-auto w-full max-w-[1240px] px-8 max-[700px]:px-5 grid grid-cols-5 gap-8 py-[60px] border-t border-b border-mk-line max-[900px]:grid-cols-2 max-[900px]:gap-6 max-[900px]:py-10 max-[600px]:grid-cols-1 max-[600px]:gap-[18px]">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <div className="font-jetbrains text-[10.5px] tracking-[0.16em] uppercase text-mk-muted">— {it.k}</div>
            <div className="font-instrument italic text-[19px] leading-[1.25] text-mk-ink max-[900px]:text-base max-[600px]:text-[17px]">
              {it.v}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="text-center py-[140px] relative max-[900px]:py-[90px]" id="cta">
      <div className="mx-auto w-full max-w-[1240px] px-8 max-[700px]:px-5 text-center">
        <Eyebrow className="justify-center w-full mb-6 !flex">
          <Pin />
          Stop opening tabs
          <Pin />
        </Eyebrow>
        <h2 className="font-space font-semibold text-[clamp(40px,7vw,84px)] leading-[0.96] tracking-[-0.035em] text-balance max-w-[14ch] mx-auto m-0 mb-6 text-mk-ink max-[900px]:text-[clamp(36px,11vw,60px)] [&_em]:font-instrument [&_em]:italic [&_em]:font-normal">
          Run your first <em>search.</em>
          <br />
          <span className="relative inline-block whitespace-nowrap">
            It's free.
            <ScribbleUnderline delay={0.4} />
          </span>
        </h2>
        <div className="flex gap-3.5 justify-center mt-9 flex-wrap max-[900px]:flex-col max-[900px]:items-stretch">
          <a className={`${BTN_PRIMARY} ${BTN_LG} max-[900px]:justify-center`} href="/request-access">
            Get started <span>→</span>
          </a>
          <a className={`${BTN_GHOST} ${BTN_LG} max-[900px]:justify-center`} href="/contact">
            Book a demo
          </a>
        </div>
        <div className="font-jetbrains text-[11px] tracking-[0.12em] uppercase text-mk-muted mt-[22px]">
          No card. 50 free searches a day.
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="mx-auto w-full max-w-[1240px] px-8 max-[700px]:px-5">
        <div className="flex justify-between items-center flex-wrap gap-5 py-10 border-t border-mk-line max-[900px]:flex-col max-[900px]:items-start max-[900px]:gap-3.5 max-[900px]:py-7">
          <span className="flex items-center gap-2.5 font-space font-bold tracking-[0.06em] text-base text-mk-ink">
            <span className="relative w-[22px] h-[22px] rounded-full bg-mk-ink overflow-hidden after:content-[''] after:absolute after:inset-1 after:rounded-full after:bg-mk-accent after:animate-mk-orbit" />
            CRWLA
          </span>
          <div className="flex gap-5 text-[13px] text-mk-muted [&_a:hover]:text-mk-accent max-[900px]:flex-wrap max-[900px]:gap-4">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            {/* <a href="#">Pricing</a>
            <a href="#">Docs</a> */}
          </div>
          <span className="font-jetbrains text-[11px] text-mk-subtle tracking-[0.06em]">© 2026 · Lagos / Abuja</span>
        </div>
      </div>
    </footer>
  );
}

export function LandingClient() {
  return (
    <div
      className="font-space bg-mk-paper text-mk-ink antialiased overflow-x-hidden min-h-screen relative selection:bg-mk-accent selection:text-white before:content-[''] before:fixed before:inset-0 before:pointer-events-none before:z-[200] before:[background-image:radial-gradient(rgba(0,0,0,0.025)_1px,transparent_1px),radial-gradient(rgba(0,0,0,0.018)_1px,transparent_1px)] before:[background-size:3px_3px,5px_5px] before:[background-position:0_0,1px_2px] before:opacity-60 before:[mix-blend-mode:multiply]"
    >
      <Nav />
      <Hero />
      <How />
      <Highlights />
      <CTA />
      <Footer />
    </div>
  );
}
