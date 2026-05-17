'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlanView } from '@/lib/queries/billing';

const REVEAL =
  'opacity-0 translate-y-7 transition-all duration-[900ms] ease-out data-[in=true]:opacity-100 data-[in=true]:translate-y-0';

type Interval = 'monthly' | 'yearly';

const TIER_ORDER: Record<PlanView['tier'], number> = {
  FREE: 0,
  STARTER: 1,
  BASIC: 2,
  PRO: 3,
  BUSINESS: 4,
};

const FEATURED_TIER: PlanView['tier'] = 'PRO';

export function PricingClient({ initialPlans }: { initialPlans: PlanView[] }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [interval, setInterval] = useState<Interval>('monthly');

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

  const plans = useMemo(
    () =>
      [...initialPlans].sort(
        (a, b) => (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99),
      ),
    [initialPlans],
  );

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
            <a className="hover:text-mk-accent" href="/about">
              About
            </a>
            <a className="text-mk-accent" href="/pricing">
              Pricing
            </a>
            <a className="hover:text-mk-accent" href="/contact">
              Contact
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-[200px] pb-[80px] px-10 max-w-[1280px] mx-auto relative z-[2] max-[900px]:pt-[130px] max-[900px]:pb-[60px] max-[900px]:px-6">
        <div className="absolute right-[8%] top-[180px] w-[360px] h-[360px] rounded-full [background:radial-gradient(circle_at_30%_30%,rgba(255,94,58,0.22),transparent_65%)] blur-[40px] -z-10 animate-mk-float max-[900px]:right-[-10%] max-[900px]:top-[60px] max-[900px]:w-[240px] max-[900px]:h-[240px]" />

        <div className="inline-flex items-center gap-2.5 font-jetbrains text-[11px] tracking-[0.2em] uppercase text-mk-dark-muted before:content-[''] before:w-1.5 before:h-1.5 before:bg-mk-accent before:rounded-full before:animate-mk-pulse">
          Pricing — Plans for every kind of researcher
        </div>
        <h1 className="font-fraunces font-normal text-[clamp(48px,8vw,124px)] leading-[0.92] tracking-[-0.04em] mt-7 max-w-[16ch] group max-[900px]:text-[clamp(40px,11vw,64px)] max-[900px]:mt-5.5 max-[900px]:max-w-full">
          Pay for the search. <em className="italic text-mk-accent">Not the ads.</em>
        </h1>
        <p className="mt-10 max-w-[60ch] text-[19px] leading-[1.55] text-mk-dark-ink-2 max-[900px]:text-base max-[900px]:mt-7">
          One subscription. No sponsored results, no upsells, no surprise charges. Start free,
          upgrade when the work asks for it,{' '}
          <strong className="font-fraunces italic font-normal text-mk-dark-ink">
            downgrade the next morning if it doesn't.
          </strong>
        </p>

        <div className="mt-10 inline-flex items-center gap-1 border border-white/15 rounded-full p-1 font-jetbrains text-[11px] tracking-[0.12em] uppercase">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            aria-pressed={interval === 'monthly'}
            className={`px-4 py-2 rounded-full transition-colors ${
              interval === 'monthly'
                ? 'bg-mk-paper text-mk-dark-bg'
                : 'text-mk-dark-ink-2 hover:text-mk-dark-ink'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval('yearly')}
            aria-pressed={interval === 'yearly'}
            className={`px-4 py-2 rounded-full transition-colors inline-flex items-center gap-2 ${
              interval === 'yearly'
                ? 'bg-mk-paper text-mk-dark-bg'
                : 'text-mk-dark-ink-2 hover:text-mk-dark-ink'
            }`}
          >
            Yearly
            <span
              className={`font-fraunces italic text-[12px] tracking-normal normal-case ${
                interval === 'yearly' ? 'text-mk-accent' : 'text-mk-accent'
              }`}
            >
              save up to 2 months
            </span>
          </button>
        </div>
      </section>

      <section
        data-reveal
        className={`${REVEAL} max-w-[1280px] mx-auto px-10 pb-[120px] relative z-[2] max-[900px]:px-6 max-[900px]:pb-[80px]`}
      >
        {plans.length === 0 ? (
          <div className="border-t border-white/10 py-20 text-center font-jetbrains text-[12px] tracking-[0.16em] uppercase text-mk-dark-muted">
            — Plans unavailable. Try again in a moment.
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-px bg-white/10 border-t border-b border-white/10 max-[1100px]:grid-cols-2 max-[700px]:grid-cols-1">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                interval={interval}
                featured={p.tier === FEATURED_TIER}
              />
            ))}
          </div>
        )}

        <div className="mt-10 grid grid-cols-3 gap-10 font-jetbrains text-[11px] tracking-[0.12em] uppercase text-mk-dark-muted max-[900px]:grid-cols-1 max-[900px]:gap-5 max-[900px]:mt-7">
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-mk-accent" />
            All plans bill in USD. Cancel any time, take your data with you.
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-mk-accent" />
            Yearly bills once per year. Downgrades apply at the next renewal.
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-mk-accent" />
            Add-ons available on every paid plan. SMS, seats, extra runs.
          </div>
        </div>
      </section>

      <section
        data-reveal
        className={`${REVEAL} max-w-[1280px] mx-auto px-10 py-[120px] border-t border-white/10 relative z-[2] max-[900px]:px-6 max-[900px]:py-[80px]`}
      >
        <div className="flex justify-between items-end flex-wrap gap-5 mb-16 max-[900px]:mb-9">
          <div>
            <div className="font-jetbrains text-[11px] tracking-[0.2em] uppercase text-mk-dark-muted inline-flex items-center gap-2.5 before:content-[''] before:w-1.5 before:h-1.5 before:bg-mk-accent before:rounded-full before:animate-mk-pulse">
              — The fine print
            </div>
            <h3 className="font-fraunces font-normal text-[clamp(32px,4.5vw,56px)] leading-[0.98] tracking-[-0.025em] mt-3.5 max-w-[18ch]">
              Questions <em className="italic text-mk-accent">we get</em> every week.
            </h3>
          </div>
          <span className="font-jetbrains text-[11px] text-mk-dark-muted tracking-[0.16em]">
            — 04 / 04
          </span>
        </div>
        <div className="flex flex-col">
          {FAQ.map((q, i) => (
            <div
              key={q.q}
              className="grid grid-cols-[80px_1fr_1.4fr] gap-10 py-9 border-t border-white/10 last:border-b last:border-white/10 items-start max-[900px]:grid-cols-1 max-[900px]:gap-3 max-[900px]:py-7"
            >
              <div className="font-jetbrains text-[13px] text-mk-dark-muted tracking-[0.1em] pt-1">
                — 0{i + 1}
              </div>
              <div className="font-fraunces font-normal text-[24px] leading-[1.15] tracking-[-0.015em] max-[900px]:text-xl">
                {q.q}
              </div>
              <div className="text-[15.5px] leading-[1.65] text-mk-dark-ink-2 max-w-[55ch]">
                {q.a}
              </div>
            </div>
          ))}
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
          Start free. Upgrade <em className="italic text-mk-accent">when it pays for itself.</em>
        </h2>
        <div className="flex gap-3.5 justify-center flex-wrap max-[600px]:flex-col max-[600px]:items-stretch">
          <a
            className="inline-flex items-center gap-2 h-[52px] px-[26px] rounded-full text-[15px] font-medium bg-mk-paper text-mk-dark-bg hover:bg-mk-accent hover:text-mk-paper transition-all duration-150 hover:-translate-y-px max-[600px]:h-[46px] max-[600px]:px-5 max-[600px]:text-sm max-[600px]:justify-center"
            href="/request-access"
          >
            Get started <span>→</span>
          </a>
          <a
            className="inline-flex items-center gap-2 h-[52px] px-[26px] rounded-full text-[15px] font-medium border border-white/20 text-mk-dark-ink hover:bg-mk-paper hover:text-mk-dark-bg hover:border-mk-paper transition-all duration-150 hover:-translate-y-px max-[600px]:h-[46px] max-[600px]:px-5 max-[600px]:text-sm max-[600px]:justify-center"
            href="/contact"
          >
            Talk to sales
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

function PlanCard({
  plan,
  interval,
  featured,
}: {
  plan: PlanView;
  interval: Interval;
  featured: boolean;
}) {
  const monthly = plan.priceMonthlyCents;
  const yearly = plan.priceYearlyCents;
  const isFree = plan.tier === 'FREE' || (monthly === 0 && yearly === 0);

  const headlineCents = interval === 'monthly' ? monthly : Math.round(yearly / 12);
  const billedSuffix = interval === 'monthly' ? '/ month' : '/ month, billed yearly';
  const savePct =
    !isFree && monthly > 0 && yearly > 0
      ? Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100))
      : 0;

  return (
    <div
      className={`relative flex flex-col gap-6 p-9 transition-colors duration-300 max-[900px]:p-7 ${
        featured
          ? 'bg-mk-dark-bg-2 hover:bg-mk-dark-bg-2'
          : 'bg-mk-dark-bg hover:bg-mk-dark-bg-2'
      }`}
    >
      {featured && (
        <span className="absolute top-5 right-5 font-jetbrains text-[9.5px] tracking-[0.18em] uppercase text-mk-accent">
          — Most picked
        </span>
      )}

      <div>
        <div className="font-jetbrains text-[10.5px] tracking-[0.2em] uppercase text-mk-dark-muted">
          — {plan.tier}
        </div>
        <h3 className="font-fraunces font-normal text-[28px] leading-[1.05] tracking-[-0.02em] mt-2.5">
          {plan.name}
        </h3>
        {plan.description && (
          <p className="mt-3 text-[14px] leading-[1.55] text-mk-dark-ink-2 min-h-[44px]">
            {plan.description}
          </p>
        )}
      </div>

      <div>
        {isFree ? (
          <div className="font-fraunces font-normal text-[56px] leading-none tracking-[-0.03em]">
            Free
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <span className="font-fraunces font-normal text-[56px] leading-none tracking-[-0.03em]">
              {formatPrice(headlineCents)}
            </span>
            <span className="font-jetbrains text-[10.5px] tracking-[0.12em] uppercase text-mk-dark-muted pb-2">
              {billedSuffix}
            </span>
          </div>
        )}
        {interval === 'yearly' && savePct > 0 && (
          <div className="mt-2 font-jetbrains text-[10.5px] tracking-[0.14em] uppercase text-mk-accent">
            — Save {savePct}% vs monthly
          </div>
        )}
        {interval === 'monthly' && !isFree && yearly > 0 && (
          <div className="mt-2 font-jetbrains text-[10.5px] tracking-[0.14em] uppercase text-mk-dark-muted">
            — {formatPrice(yearly)} billed yearly
          </div>
        )}
      </div>

      <a
        href="/request-access"
        className={`inline-flex items-center justify-center h-[44px] rounded-full text-[13.5px] font-medium transition-all duration-150 hover:-translate-y-px ${
          featured
            ? 'bg-mk-accent text-mk-paper hover:bg-mk-paper hover:text-mk-dark-bg'
            : 'border border-white/20 text-mk-dark-ink hover:bg-mk-paper hover:text-mk-dark-bg hover:border-mk-paper'
        }`}
      >
        {isFree ? 'Start free' : `Choose ${plan.name}`}
      </a>

      <ul className="flex flex-col gap-2.5 mt-1">
        {plan.features.map((f) => (
          <li
            key={f.key}
            className="grid grid-cols-[14px_1fr] gap-3 text-[13.5px] leading-[1.5] text-mk-dark-ink-2"
          >
            <span
              aria-hidden="true"
              className="mt-[7px] w-1.5 h-1.5 rounded-full bg-mk-accent"
            />
            <span>{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatPrice(cents: number) {
  const dollars = cents / 100;
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  });
  return fmt.format(dollars);
}

const FAQ = [
  {
    q: 'Can I change plans whenever I want?',
    a: 'Yes. Upgrades take effect immediately and are prorated. Downgrades schedule for the end of your current billing period — you keep what you paid for.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: "It stays for 30 days after cancellation so you can come back or export. After that we permanently delete saved searches, results, and team notes. Nothing is sold, ever.",
  },
  {
    q: 'Do you offer student or non-profit pricing?',
    a: 'The Starter plan is already priced for solo researchers. Verified non-profits and accredited newsrooms get 30% off Business — email us from your work address.',
  },
  {
    q: 'Is there an API or webhook access?',
    a: 'Webhooks (Slack, Zapier, custom URLs) ship on Pro and above. A read API for Business customers is in private beta — ask us if you want in.',
  },
];
