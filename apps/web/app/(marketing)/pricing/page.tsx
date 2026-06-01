import type { Metadata } from 'next';
import { api } from '@/lib/api';
import type { PlanView } from '@/lib/queries/billing';
import { PricingClient } from './pricing-client';

const description =
  'Simple CRWLA pricing — pick a plan, cancel any time, no ads ever. Start free with 50 searches a day and upgrade as your research scales.';

export const metadata: Metadata = {
  title: 'Pricing',
  description,
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'CRWLA Pricing',
    description,
    url: '/pricing',
  },
  twitter: {
    title: 'CRWLA Pricing',
    description,
  },
};

export default async function PricingPage() {
  let plans: PlanView[] = [];
  try {
    const res = await api.get<{ plans: PlanView[] }>('/billing/plans');
    plans = res.plans;
  } catch {
    // API unreachable at render time — render the page with an empty list;
    // the client component shows a graceful fallback.
  }

  return <PricingClient initialPlans={plans} />;
}
