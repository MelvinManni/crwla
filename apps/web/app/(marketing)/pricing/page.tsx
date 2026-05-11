import type { Metadata } from 'next';
import { api } from '@/lib/api';
import type { PlanView } from '@/lib/queries/billing';
import { PricingClient } from './pricing-client';

export const metadata: Metadata = {
  title: 'Pricing — CRWLA',
  description: 'Pick a plan. Cancel any time. No ads, ever.',
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
