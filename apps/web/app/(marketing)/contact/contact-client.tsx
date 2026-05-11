'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

type Purpose = 'demo' | 'sales' | 'press' | 'support' | 'other';

const PURPOSE_LABELS: Record<Purpose, string> = {
  demo: '— demo · ~30 min',
  sales: '— sales · team plans',
  press: '— press · Ada replies',
  support: '— support · 24h SLA',
  other: '— just hi',
};

const PURPOSES: { key: Purpose; label: string }[] = [
  { key: 'demo', label: 'Request a demo' },
  { key: 'sales', label: 'Talk to sales' },
  { key: 'press', label: 'Press inquiry' },
  { key: 'support', label: 'Support' },
  { key: 'other', label: 'Other' },
];

const ROLES = [
  'Journalist / editor',
  'Researcher / analyst',
  'Marketing / PR',
  'Procurement / ops',
  'Founder / exec',
  'Student',
  'Other',
];

const CONFETTI_COLORS = ['#ff5e3a', '#2f4a3a', '#2b4eb8', '#0e0e0e', '#ff5e3a'];

const INPUT_CLS =
  'bg-transparent border-0 border-b-[1.5px] border-mk-light-line-2 pt-2.5 pb-3 text-base text-mk-ink transition-colors duration-[250ms] focus:outline-none focus:border-mk-accent placeholder:text-[#b8b3a4]';

const FIELD_LABEL = 'font-jetbrains text-[10.5px] tracking-[0.16em] uppercase text-mk-light-muted mb-2';

const CHANNEL_VAL = 'font-instrument text-[20px] leading-[1.2] text-mk-ink transition-colors duration-[250ms]';

const CHANNELS = [
  { label: 'Email', value: 'hello@crwla.com', meta: 'General inbox · 24h reply', href: 'mailto:hello@crwla.com' },
  { label: 'Sales', value: 'sales@crwla.com', meta: 'Teams, agencies, custom plans', href: 'mailto:sales@crwla.com' },
  { label: 'Press', value: 'press@crwla.com', meta: 'Embargo-friendly · Ada replies', href: 'mailto:press@crwla.com' },
];

export function ContactClient() {
  const [scrolled, setScrolled] = useState(false);
  const [purpose, setPurpose] = useState<Purpose>('demo');
  const [volume, setVolume] = useState(50);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confettiRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function spawnConfetti() {
    const c = confettiRef.current;
    if (!c) return;
    c.innerHTML = '';
    for (let i = 0; i < 36; i++) {
      const s = document.createElement('span');
      s.className = 'absolute w-[7px] h-[7px] rounded-full opacity-0 animate-mk-fall';
      s.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 30 + '%';
      s.style.animationDelay = Math.random() * 0.5 + 's';
      c.appendChild(s);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      purpose,
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      company: String(data.get('company') ?? '').trim() || null,
      role: String(data.get('role') ?? '').trim() || null,
      volume,
      message: String(data.get('message') ?? '').trim() || null,
    };
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Submission failed (${res.status})`);
      }
      setSent(true);
      spawnConfetti();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="font-inter bg-mk-light-bg text-mk-ink antialiased overflow-x-hidden min-h-screen relative selection:bg-mk-accent selection:text-white before:content-[''] before:fixed before:inset-0 before:[background-image:radial-gradient(rgba(14,14,14,0.06)_1px,transparent_1px)] before:[background-size:22px_22px] before:[background-position:11px_11px] before:pointer-events-none before:z-0 before:[mask-image:radial-gradient(ellipse_at_50%_30%,black_30%,transparent_75%)] before:[-webkit-mask-image:radial-gradient(ellipse_at_50%_30%,black_30%,transparent_75%)]">
      <nav
        className={[
          'sticky top-0 z-50 backdrop-blur-md bg-[rgba(250,250,247,0.7)] border-b transition-colors duration-200',
          scrolled ? 'border-mk-light-line' : 'border-transparent',
        ].join(' ')}
      >
        <div className="max-w-[1280px] mx-auto px-10 h-16 flex items-center justify-between max-[600px]:px-5 max-[600px]:h-14">
          <a className="flex items-center gap-2.5 font-semibold tracking-[0.08em] text-sm" href="/">
            <span className="relative w-[18px] h-[18px] rounded-full bg-mk-ink overflow-hidden after:content-[''] after:absolute after:inset-1 after:rounded-full after:bg-mk-accent after:animate-mk-orbit" />
            CRWLA
          </a>
          <div className="flex gap-7 text-[13px] text-mk-light-ink-2 max-[600px]:gap-4 max-[600px]:text-xs">
            <a className="hover:text-mk-accent" href="/">
              Home
            </a>
            <a className="hover:text-mk-accent" href="/about">
              About
            </a>
            <a className="text-mk-accent" href="/contact">
              Contact
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-[1280px] mx-auto px-10 pt-[60px] pb-[100px] grid grid-cols-[1.05fr_1fr] gap-20 items-start relative z-[1] max-[920px]:grid-cols-1 max-[920px]:gap-14 max-[920px]:px-6 max-[920px]:pt-10 max-[920px]:pb-20 max-[600px]:px-5 max-[600px]:pt-8 max-[600px]:pb-[70px]">
        <section>
          <div className="inline-flex items-center gap-2.5 font-jetbrains text-[11px] tracking-[0.2em] uppercase text-mk-light-muted before:content-[''] before:w-1.5 before:h-1.5 before:bg-mk-accent before:rounded-full before:animate-mk-pulse">
            Get in touch
          </div>
          <h1 className="font-instrument font-normal text-[clamp(48px,7vw,96px)] leading-[0.96] tracking-[-0.02em] mt-6 max-w-[12ch] max-[920px]:text-[clamp(40px,11vw,64px)]">
            Say <em className="italic text-mk-accent">hello.</em>
          </h1>
          <p className="text-[18px] leading-[1.6] text-mk-light-muted mt-7 max-w-[46ch] max-[920px]:text-base max-[920px]:mt-5">
            Whether you want a demo, an integration, or just to tell us how your last research project went —{' '}
            <em className="font-instrument italic text-mk-light-ink-2">we read every message</em>, and we usually reply within a
            day.
          </p>

          <div className="mt-14 bg-mk-light-panel border border-mk-light-line rounded-[14px] py-7 px-[30px] relative shadow-[0_1px_0_rgba(0,0,0,0.03),0_16px_32px_-16px_rgba(0,0,0,0.08)] -rotate-[1deg] transition-transform duration-[400ms] hover:rotate-0 before:content-[''] before:absolute before:-top-2.5 before:left-[30%] before:w-[90px] before:h-[22px] before:bg-mk-accent/55 before:-rotate-3 before:rounded-sm before:[background-image:linear-gradient(90deg,rgba(255,255,255,0.18)_50%,transparent_50%)] before:[background-size:6px_100%] max-[920px]:mt-10 max-[920px]:p-6 max-[600px]:before:left-[22%]">
            <h3 className="font-instrument italic font-normal text-[26px] leading-[1.15] m-0 mb-3 max-[920px]:text-[22px]">
              P.S. — we love
              <br />
              weird use cases.
            </h3>
            <p className="text-[14.5px] leading-[1.6] text-mk-light-ink-2 m-0">
              If you're using CRWLA for something we never imagined — tracking wildlife sightings, comparing recipe blogs,
              finding lost relatives — please tell us. The product gets better when we hear from you.
            </p>
          </div>

          <div className="mt-10 flex flex-col max-[920px]:mt-8">
            {CHANNELS.map((ch, idx) => (
              <a
                key={idx}
                className="group grid grid-cols-[110px_1fr_auto] gap-6 items-center py-5 px-1 border-t border-mk-light-line last:border-b last:border-mk-light-line transition-[padding] duration-[250ms] cursor-pointer hover:pl-3 max-[920px]:py-5 max-[920px]:gap-4 max-[600px]:grid-cols-1 max-[600px]:gap-1.5 max-[600px]:items-start max-[600px]:py-4 max-[600px]:hover:pl-1"
                href={ch.href}
              >
                <span className="font-jetbrains text-[11px] tracking-[0.16em] uppercase text-mk-light-muted">— {ch.label}</span>
                <span className={`${CHANNEL_VAL} group-hover:text-mk-accent max-[920px]:text-lg max-[600px]:text-[17px]`}>
                  {ch.value}
                  <span className="block font-inter text-xs text-mk-light-muted mt-1 tracking-normal max-[600px]:text-[11.5px]">
                    {ch.meta}
                  </span>
                </span>
                <span className="font-instrument text-[28px] text-mk-light-ink-2 transition-[transform,color] duration-[250ms] group-hover:translate-x-1 group-hover:text-mk-accent max-[600px]:hidden">
                  →
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="relative bg-mk-light-panel border border-mk-light-line rounded-[20px] p-10 sticky top-[100px] overflow-hidden shadow-[0_1px_0_rgba(0,0,0,0.03),0_30px_60px_-30px_rgba(0,0,0,0.12)] before:content-[''] before:absolute before:-right-20 before:-top-20 before:w-[240px] before:h-[240px] before:[background:radial-gradient(circle,rgba(255,94,58,0.18),transparent_65%)] before:pointer-events-none before:animate-mk-drift max-[920px]:static max-[920px]:p-8 max-[920px]:px-6 max-[920px]:rounded-2xl">
          <div className="absolute -left-[50px] top-[220px] text-mk-accent pointer-events-none opacity-0 max-[1100px]:hidden" style={{ animation: 'mk-fade-in 1.6s ease-out 0.6s forwards' }}>
            <svg width="80" height="60" viewBox="0 0 80 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path
                d="M 4 50 C 18 44, 28 28, 40 22 C 52 16, 62 16, 74 14"
                style={{ strokeDasharray: 240, strokeDashoffset: 240, animation: 'mk-trace 2s ease-out 0.4s forwards' }}
              />
              <path
                d="M 68 8 L 74 14 L 68 20"
                style={{ strokeDasharray: 240, strokeDashoffset: 240, animation: 'mk-trace 2s ease-out 0.4s forwards' }}
              />
            </svg>
          </div>

          {!sent && (
            <div className="relative z-[1]">
              <div className="flex justify-between items-start mb-8 max-[600px]:flex-col max-[600px]:gap-2.5 max-[600px]:items-start">
                <h2 className="font-instrument font-normal text-[30px] leading-[1.1] tracking-[-0.01em] m-0 max-[920px]:text-[26px]">
                  Write to <em className="italic text-mk-accent">us.</em>
                </h2>
                <span className="font-jetbrains text-[10.5px] text-mk-light-muted tracking-[0.14em] px-2.5 py-1 border border-mk-light-line rounded-full">
                  {PURPOSE_LABELS[purpose]}
                </span>
              </div>

              <div className="flex gap-2 flex-wrap mb-6 relative z-[1]">
                {PURPOSES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPurpose(p.key)}
                    className={[
                      'px-3.5 py-2.5 border rounded-full text-[13px] inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer',
                      'max-[600px]:text-xs max-[600px]:px-3 max-[600px]:py-2',
                      purpose === p.key
                        ? 'bg-mk-ink text-white border-mk-ink'
                        : 'border-mk-light-line text-mk-light-ink-2 bg-transparent hover:border-mk-light-ink-2',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'w-1.5 h-1.5 rounded-full bg-mk-accent transition-opacity duration-200',
                        purpose === p.key ? 'opacity-100' : 'opacity-0',
                      ].join(' ')}
                    />
                    {p.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-[18px] mb-[18px] max-[600px]:grid-cols-1">
                  <div className="flex flex-col">
                    <label className={FIELD_LABEL}>Your name</label>
                    <input name="name" type="text" placeholder="Ada Okonkwo" required className={INPUT_CLS} />
                  </div>
                  <div className="flex flex-col">
                    <label className={FIELD_LABEL}>Work email</label>
                    <input name="email" type="email" placeholder="you@company.com" required className={INPUT_CLS} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[18px] mb-[18px] max-[600px]:grid-cols-1">
                  <div className="flex flex-col">
                    <label className={FIELD_LABEL}>Company</label>
                    <input name="company" type="text" placeholder="Newsroom, agency, etc." className={INPUT_CLS} />
                  </div>
                  <div className="flex flex-col">
                    <label className={FIELD_LABEL}>Role</label>
                    <select name="role" defaultValue={ROLES[0]} className={INPUT_CLS}>
                      {ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col mb-[18px]">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={`${FIELD_LABEL} mb-0`}>Volume — how big a list?</label>
                    <span className="font-instrument italic text-[22px] text-mk-accent">~ {volume}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="appearance-none w-full h-1 bg-mk-light-line-2 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-mk-accent [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,94,58,0.18)] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-mk-accent [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(255,94,58,0.18)]"
                  />
                </div>

                <div className="flex flex-col mb-[18px]">
                  <label className={FIELD_LABEL}>Tell us a bit more</label>
                  <textarea
                    name="message"
                    placeholder="What are you searching for? What's the deadline? Anything we should know."
                    className={`${INPUT_CLS} min-h-[110px] resize-y`}
                  />
                </div>

                <div className="flex justify-between items-center mt-7 gap-4 flex-wrap max-[600px]:flex-col max-[600px]:items-stretch">
                  <p className="text-xs text-mk-light-muted leading-[1.5] max-w-[28ch] m-0 max-[600px]:max-w-full">
                    By submitting you agree to our <a className="underline decoration-mk-light-line-2" href="#">privacy policy</a>.
                    We won't share your details.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group inline-flex items-center gap-2.5 h-[52px] px-7 bg-mk-ink text-white border-0 rounded-full text-[15px] font-medium cursor-pointer transition-[background,transform] duration-150 hover:bg-mk-accent hover:-translate-y-px disabled:opacity-70 disabled:cursor-progress max-[600px]:w-full max-[600px]:justify-center"
                  >
                    {submitting ? 'Sending…' : 'Send message'}{' '}
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </div>

                {error && <div className="mt-4 font-jetbrains text-xs text-[#c0341d]">{error}</div>}
              </form>
            </div>
          )}

          {sent && (
            <div className="flex flex-col items-center text-center py-[60px] px-5 relative z-[1]">
              <div className="absolute inset-0 pointer-events-none overflow-hidden" ref={confettiRef} />
              <div className="w-[120px] h-[120px] border-2 border-dashed border-mk-accent rounded-full flex items-center justify-center font-instrument italic text-mk-accent text-xl -rotate-[8deg] animate-mk-bounce-in max-[600px]:w-[100px] max-[600px]:h-[100px] max-[600px]:text-[17px]">
                SENT!
              </div>
              <h3 className="font-instrument text-4xl mt-7 mb-3 font-normal tracking-[-0.01em] max-[600px]:text-[28px]">
                Got it. <em className="italic text-mk-accent">Thank you.</em>
              </h3>
              <p className="text-mk-light-muted max-w-[36ch] m-0">
                We'll be back to you within a day. Usually faster — and from a real human, not a templated drip.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-[1280px] mx-auto px-10 py-7 border-t border-mk-light-line flex justify-between flex-wrap gap-5 font-jetbrains text-[11px] tracking-[0.1em] text-mk-light-muted relative z-[1] max-[600px]:px-5 max-[600px]:py-6 max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-3">
        <span>© 2026 CRWLA Labs</span>
        <div className="flex gap-6 [&_a:hover]:text-mk-accent max-[600px]:flex-wrap max-[600px]:gap-3.5">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          {/* <a href="#">Docs</a> */}
        </div>
        <span>hello@crwla.com</span>
      </footer>
    </div>
  );
}
