'use client';

import { useEffect, useRef } from 'react';

const REVEAL = 'opacity-0 translate-y-7 transition-all duration-[900ms] ease-out data-[in=true]:opacity-100 data-[in=true]:translate-y-0';

export function AboutClient() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = 'true';
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="font-space bg-mk-dark-bg text-mk-dark-ink antialiased overflow-x-hidden min-h-screen relative selection:bg-mk-accent selection:text-mk-dark-bg before:content-[''] before:fixed before:inset-0 before:[background-image:radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] before:[background-size:4px_4px] before:pointer-events-none before:z-[1]"
    >
      <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md bg-[rgba(17,17,16,0.6)] border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-10 h-16 flex items-center justify-between max-[900px]:px-5 max-[900px]:h-14">
          <a className="flex items-center gap-2.5 font-semibold tracking-[0.08em] text-sm" href="/">
            <span className="relative w-[18px] h-[18px] rounded-full bg-mk-paper after:content-[''] after:absolute after:inset-1 after:rounded-full after:bg-mk-accent" />
            CRWLA
          </a>
          <div className="flex gap-7 text-[13px] text-mk-dark-ink-2 max-[900px]:gap-[18px] max-[900px]:text-xs max-[600px]:gap-3.5 max-[600px]:text-[11.5px]">
            <a className="hover:text-mk-accent max-[600px]:hidden" href="/">
              Home
            </a>
            <a className="text-mk-accent" href="/about">
              About
            </a>
            <a className="hover:text-mk-accent" href="/pricing">
              Pricing
            </a>
            <a className="hover:text-mk-accent" href="/contact">
              Contact
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-[200px] pb-[100px] px-10 max-w-[1280px] mx-auto relative z-[2] max-[900px]:pt-[130px] max-[900px]:pb-[70px] max-[900px]:px-6">
        <div className="absolute right-[8%] top-[180px] w-[360px] h-[360px] rounded-full [background:radial-gradient(circle_at_30%_30%,rgba(255,94,58,0.22),transparent_65%)] blur-[40px] -z-10 animate-mk-float max-[900px]:right-[-10%] max-[900px]:top-[60px] max-[900px]:w-[240px] max-[900px]:h-[240px]" />
        <div className="absolute right-[6%] top-[240px] w-[220px] h-[220px] pointer-events-none max-[900px]:right-[4%] max-[900px]:top-[120px] max-[900px]:w-[140px] max-[900px]:h-[140px] max-[900px]:opacity-70" aria-hidden="true">
          <svg viewBox="-50 -50 100 100" className="w-full h-full overflow-visible">
            <g className="[transform-origin:50%_50%] animate-mk-spin">
              <circle cx="40" cy="0" r="3" fill="#ff5e3a" />
              <circle cx="-40" cy="0" r="2" fill="#8fc28a" />
              <circle cx="0" cy="40" r="2.5" fill="#f5f3ee" />
              <circle cx="0" cy="-40" r="2" fill="#ff5e3a" opacity="0.5" />
              <circle cx="28" cy="28" r="1.5" fill="#f5f3ee" opacity="0.6" />
            </g>
            <circle cx="0" cy="0" r="40" fill="none" stroke="rgba(245,243,238,0.08)" strokeDasharray="2 4" />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2.5 font-jetbrains text-[11px] tracking-[0.2em] uppercase text-mk-dark-muted before:content-[''] before:w-1.5 before:h-1.5 before:bg-mk-accent before:rounded-full before:animate-mk-pulse">
          About — Est. 2025
        </div>
        <h1 className="font-fraunces font-normal text-[clamp(48px,8vw,124px)] leading-[0.92] tracking-[-0.04em] mt-7 max-w-[14ch] group max-[900px]:text-[clamp(40px,11vw,64px)] max-[900px]:mt-5.5 max-[900px]:max-w-full">
          We were tired of <em className="italic text-mk-accent">opening tabs.</em>
          <br />
          So we built{' '}
          <span className="inline-block transition-[letter-spacing] duration-[400ms] group-hover:tracking-[0.04em]">CRWLA.</span>
        </h1>
        <p className="mt-10 max-w-[60ch] text-[19px] leading-[1.55] text-mk-dark-ink-2 max-[900px]:text-base max-[900px]:mt-7">
          Three researchers, one journalist, and a frustrated procurement officer walked into a room. By the end of the week
          we had a prototype. By the end of the month we had stopped opening tabs altogether.{' '}
          <strong className="font-fraunces italic font-normal text-mk-dark-ink">This is the company we wish existed when we started.</strong>
        </p>
      </section>

      <section
        data-reveal
        className={`${REVEAL} relative z-[2] px-10 py-[120px] max-w-[1280px] mx-auto border-t border-white/10 grid grid-cols-[1fr_1.6fr] gap-20 max-[900px]:px-6 max-[900px]:py-20 max-[900px]:grid-cols-1 max-[900px]:gap-9 max-[800px]:grid-cols-1`}
      >
        <div>
          <div className="font-jetbrains text-[11px] tracking-[0.18em] uppercase text-mk-dark-muted">— Manifesto</div>
        </div>
        <div>
          <h2 className="font-fraunces font-normal text-[clamp(28px,3.8vw,48px)] leading-[1.08] tracking-[-0.025em] m-0 text-balance">
            The web is <em className="italic text-mk-accent">more useful</em> than its interfaces let on.
          </h2>
          <p className="text-[17px] leading-[1.7] text-mk-dark-ink-2 mt-6 max-w-[60ch]">
            A search engine wants you on a search engine. A social platform wants you scrolling. A news site wants ad
            impressions. The fastest way to find <em className="font-fraunces italic">anything</em> meaningful is to escape all of them,
            at once, in parallel. That's what CRWLA does.
          </p>
          <p className="text-[17px] leading-[1.7] text-mk-dark-ink-2 mt-6 max-w-[60ch]">
            We don't generate answers. We don't write your report. We find{' '}
            <em className="font-fraunces italic">everything that's there</em> and hand it to you, in one place, ranked by how useful
            it is to <em className="font-fraunces italic">you</em> — not to the platform that hosts it.
          </p>
          <div className="mt-12 py-8 px-9 border-l-2 border-mk-accent bg-mk-accent/5 font-fraunces italic text-[22px] leading-[1.4] text-mk-dark-ink max-[900px]:text-lg max-[900px]:py-6 max-[900px]:px-5.5 max-[900px]:mt-8">
            "Search engines optimize for engagement. CRWLA optimizes for the user already knowing what they're looking for."
          </div>
        </div>
      </section>

      <section
        data-reveal
        className={`${REVEAL} max-w-[1280px] mx-auto px-10 py-[100px] border-t border-white/10 relative z-[2] max-[900px]:px-6 max-[900px]:py-[70px]`}
      >
        <div className="flex justify-between items-end flex-wrap gap-5 mb-20 max-[900px]:mb-12">
          <div>
            <div className="font-jetbrains text-[11px] tracking-[0.2em] uppercase text-mk-dark-muted inline-flex items-center gap-2.5 before:content-[''] before:w-1.5 before:h-1.5 before:bg-mk-accent before:rounded-full before:animate-mk-pulse">
              What we believe
            </div>
            <h3 className="font-fraunces font-normal text-[clamp(32px,4.5vw,56px)] leading-[0.98] tracking-[-0.025em] mt-3.5 max-w-[18ch]">
              Six things we built
              <br />
              this on, and <em className="italic text-mk-accent">won't</em> bend.
            </h3>
          </div>
          <span className="font-jetbrains text-[11px] text-mk-dark-muted tracking-[0.16em]">— 06 / 06</span>
        </div>
        <div className="flex flex-col">
          {VALUES.map((v) => (
            <div
              key={v.num}
              className="group grid grid-cols-[80px_1fr_1.4fr] gap-10 py-10 border-t border-white/10 last:border-b last:border-white/10 items-start transition-[padding] duration-300 hover:pl-4 max-[900px]:grid-cols-1 max-[900px]:gap-3 max-[900px]:py-7 max-[900px]:hover:pl-0"
            >
              <div className="font-jetbrains text-[13px] text-mk-dark-muted tracking-[0.1em] pt-1 transition-colors duration-300 group-hover:text-mk-accent">
                — {v.num}
              </div>
              <div
                className="font-fraunces font-normal text-[28px] leading-[1.1] tracking-[-0.02em] max-[900px]:text-2xl [&_em]:italic [&_em]:text-mk-accent"
                dangerouslySetInnerHTML={{ __html: v.title }}
              />
              <div className="text-[15.5px] leading-[1.65] text-mk-dark-ink-2 max-w-[50ch]">{v.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        data-reveal
        className={`${REVEAL} max-w-[1280px] mx-auto px-10 py-[140px] border-t border-white/10 relative z-[2] max-[900px]:px-6 max-[900px]:py-[90px]`}
      >
        <h2 className="font-fraunces font-normal italic text-[clamp(36px,6vw,88px)] leading-[1] tracking-[-0.03em] m-0 mb-[60px] max-w-[16ch] max-[900px]:mb-9 max-[900px]:text-[clamp(32px,9vw,52px)]">
          <span className="line-through [text-decoration-color:#ff5e3a] [text-decoration-thickness:4px] text-mk-dark-muted not-italic">
            A founder's
          </span>
          <br />
          A user's <span className="text-mk-accent">story.</span>
        </h2>
        <div className="columns-2 gap-[60px] max-w-[1000px] text-[16.5px] leading-[1.75] text-mk-dark-ink-2 [&_p]:mt-0 [&_p]:mb-4.5 [&_p]:break-inside-avoid max-[900px]:columns-1 max-[900px]:text-base max-[700px]:columns-1">
          <p className="first:first-letter:font-fraunces first:first-letter:italic first:first-letter:text-[4em] first:first-letter:leading-[0.9] first:first-letter:float-left first:first-letter:pt-1 first:first-letter:pr-2.5 first:first-letter:text-mk-accent">
            It started with a market scan. One of us was researching cement pricing across West Africa for a client — six
            countries, fourteen suppliers, three news outlets per region. By tab forty-two, we gave up and started taking
            screenshots. By tab sixty, the laptop fan had become an instrument. The work that should have taken a morning
            took three days.
          </p>
          <p>
            That weekend we wrote a script. It pasted keywords into search engines, scraped headlines, dropped them in a
            spreadsheet. It was ugly. It worked. Three colleagues asked for it. Then six. Then a whole agency wanted a
            version with sharing built in.
          </p>
          <p>
            We kept building. The script became a tool. The tool became a workspace. The workspace became{' '}
            <em className="font-fraunces italic">CRWLA</em>. Today it's used by journalists chasing leads across newsrooms,
            marketing teams monitoring brand sentiment, procurement officers comparing vendors across socials, and one
            political campaign team we definitely cannot name.
          </p>
          <p>
            We're still small. We're still based out of Lagos and Abuja. We still use the product ourselves every day —
            usually before coffee — and we still fix the bugs the same morning we find them.
          </p>
        </div>
      </section>

      <section
        data-reveal
        className={`${REVEAL} max-w-[1280px] mx-auto px-10 py-20 border-t border-b border-white/10 grid grid-cols-4 gap-10 relative z-[2] max-[900px]:grid-cols-2 max-[900px]:px-6 max-[900px]:py-14 max-[900px]:gap-7`}
      >
        <Stat n="12" suffix="K" label="— Active users" />
        <Stat n="340" suffix="M" label="— Results crawled / month" />
        <Stat n="6.4" suffix="×" label="— Median speed-up vs manual" />
        <Stat n="14" label="— Source types supported" />
      </section>

      <section
        data-reveal
        className={`${REVEAL} max-w-[1280px] mx-auto px-10 py-[140px] relative z-[2] max-[900px]:px-6 max-[900px]:py-[90px]`}
      >
        <div className="inline-flex items-center gap-2.5 font-jetbrains text-[11px] tracking-[0.2em] uppercase text-mk-dark-muted before:content-[''] before:w-1.5 before:h-1.5 before:bg-mk-accent before:rounded-full before:animate-mk-pulse">
          — Crew
        </div>
        <h3 className="font-fraunces font-normal text-[clamp(32px,4.5vw,56px)] leading-[1] tracking-[-0.025em] mt-3.5 mb-[60px] max-w-[18ch] max-[900px]:mb-9">
          Built by people
          <br />
          who <em className="italic text-mk-accent">use</em> it.
        </h3>
        <div className="grid grid-cols-3 gap-px bg-white/10 max-[800px]:grid-cols-1">
          <Person glyph="M" name="Mavis Lucky" role="— Co-founder, product">
            Market Research/Strategist. Spent two years writing about Nigerian fin-tech before deciding the research tools were the actual story.
          </Person>
          <Person glyph="K" name="Nnamani Kosisochukwu" role="— Co-founder, engineering">
            Built the first crawler over a weekend. Maintains the search engine and most of his sleep deprivation single-handedly.
          </Person>
          {/* <Person glyph="K" name="Kemi Bello" role="— Design & research">
            Reformed UX researcher at a consumer bank. Now spends her days interviewing power users about why they hate tab bars.
          </Person> */}
        </div>
      </section>

      <section
        data-reveal
        className={`${REVEAL} max-w-[1280px] mx-auto px-10 py-[120px] border-t border-white/10 text-center relative z-[2] max-[900px]:px-6 max-[900px]:py-[90px]`}
      >
        <div className="inline-flex items-center gap-2.5 font-jetbrains text-[11px] tracking-[0.2em] uppercase text-mk-dark-muted before:content-[''] before:w-1.5 before:h-1.5 before:bg-mk-accent before:rounded-full before:animate-mk-pulse">
          — Try it
        </div>
        <h2 className="font-fraunces font-normal text-[clamp(40px,7vw,96px)] leading-[0.96] tracking-[-0.035em] mt-6 mb-9 max-w-[16ch] mx-auto max-[900px]:text-[clamp(36px,10vw,60px)]">
          Run your first <em className="italic text-mk-accent">search.</em> See what we mean.
        </h2>
        <div className="flex gap-3.5 justify-center flex-wrap max-[600px]:flex-col max-[600px]:items-stretch">
          <a
            className="inline-flex items-center gap-2 h-[52px] px-[26px] rounded-full text-[15px] font-medium bg-mk-paper text-mk-dark-bg hover:bg-mk-accent hover:text-mk-paper transition-all duration-150 hover:-translate-y-px max-[600px]:h-[46px] max-[600px]:px-5 max-[600px]:text-sm max-[600px]:justify-center"
            href="/signup"
          >
            Get started <span>→</span>
          </a>
          <a
            className="inline-flex items-center gap-2 h-[52px] px-[26px] rounded-full text-[15px] font-medium border border-white/20 text-mk-dark-ink hover:bg-mk-paper hover:text-mk-dark-bg hover:border-mk-paper transition-all duration-150 hover:-translate-y-px max-[600px]:h-[46px] max-[600px]:px-5 max-[600px]:text-sm max-[600px]:justify-center"
            href="/contact"
          >
            Talk to us
          </a>
        </div>
      </section>

      <footer className="max-w-[1280px] mx-auto px-10 py-7 border-t border-white/10 flex justify-between flex-wrap gap-5 font-jetbrains text-[11px] tracking-[0.1em] text-mk-dark-muted relative z-[2] max-[900px]:px-6 max-[900px]:flex-col max-[900px]:items-start max-[900px]:gap-3.5">
        <span>© 2026 CRWLA Labs · Lagos / Abuja</span>
        <div className="flex gap-6 [&_a:hover]:text-mk-accent max-[900px]:flex-wrap max-[900px]:gap-4">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/pricing">Pricing</a>
          <a href="/contact">Contact</a>
          <a href="#">Docs</a>
        </div>
        <span>v 0.9 · made by humans</span>
      </footer>
    </div>
  );
}

function Stat({ n, suffix, label }: { n: string; suffix?: string; label: string }) {
  return (
    <div>
      <div className="font-fraunces font-normal text-[clamp(40px,5vw,72px)] leading-none tracking-[-0.03em] text-mk-dark-ink max-[600px]:text-[44px]">
        {n}
        {suffix && <em className="italic text-mk-accent">{suffix}</em>}
      </div>
      <div className="font-jetbrains text-[10.5px] tracking-[0.18em] uppercase text-mk-dark-muted mt-3">{label}</div>
    </div>
  );
}

function Person({ glyph, name, role, children }: { glyph: string; name: string; role: string; children: React.ReactNode }) {
  return (
    <div className="bg-mk-dark-bg p-10 px-8 transition-colors duration-300 hover:bg-mk-dark-bg-2 relative overflow-hidden group max-[800px]:p-8 max-[800px]:px-6">
      <div className="font-fraunces italic text-[96px] leading-[0.8] text-mk-accent mb-7.5 transition-transform duration-500 group-hover:translate-x-1.5 max-[800px]:text-[72px] max-[800px]:mb-5.5">
        {glyph}
      </div>
      <h4 className="font-space font-medium text-[17px] m-0 mb-1 tracking-[-0.01em]">{name}</h4>
      <div className="font-jetbrains text-[10.5px] tracking-[0.16em] uppercase text-mk-dark-muted mb-4.5">{role}</div>
      <p className="text-[14.5px] leading-[1.6] text-mk-dark-ink-2 m-0">{children}</p>
    </div>
  );
}

const VALUES = [
  {
    num: '01',
    title: 'Speed is a <em>feature.</em>',
    body:
      "If a result takes longer to find than to write up, we've failed. Every lane runs in parallel. Every query is cached. Every page loads under a second.",
  },
  {
    num: '02',
    title: 'No <em>ads.</em> Ever.',
    body:
      'Sponsored results are noise. We charge a subscription so we never have to compromise what we put in front of you.',
  },
  {
    num: '03',
    title: 'Your data is <em>yours.</em>',
    body:
      "Saved sets, annotations, team notes — exportable, deletable, never sold. We log who searched what only for your team's activity feed.",
  },
  {
    num: '04',
    title: 'Built for <em>professionals.</em>',
    body:
      'Power users hit ceilings other tools never test. Boolean queries, bulk imports, scheduled monitoring — we ship the things you actually need.',
  },
  {
    num: '05',
    title: 'Local <em>first.</em>',
    body:
      'Lagos prices, Abuja vendors, Kano media. Our crawl respects geography because the people we built this for do too.',
  },
  {
    num: '06',
    title: 'Boring <em>infrastructure</em>, exciting outputs.',
    body:
      "We don't ship animations for animation's sake. We ship the smallest possible interface around the most powerful crawler we can build.",
  },
];
