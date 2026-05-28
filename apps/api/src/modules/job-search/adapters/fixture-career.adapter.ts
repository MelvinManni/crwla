import { Injectable } from '@nestjs/common';
import type { CareerAdapter, CareerAdapterContext, RawJob } from './career-page.adapter';

/**
 * Fixture data mirrors the design's `CRAWLA.jobs` so the FE renders the
 * same job cards out of the box. Each entry is matched to the company by
 * name; companies without an entry generate a synthesized listing so the
 * pipeline never returns an empty list for a newly-tracked company.
 */
const FIXTURE_JOBS: Record<string, RawJob[]> = {
  Stripe: [
    {
      title: 'Senior Product Designer',
      location: 'San Francisco, CA',
      remote: true,
      salaryMin: 180_000,
      salaryMax: 240_000,
      currency: 'USD',
      salaryPeriod: 'year',
      url: 'https://stripe.com/jobs/listing/senior-product-designer/123',
      description:
        'Design the next chapter of Stripe Atlas — a fast-moving B2B product used by founders worldwide.',
      tags: ['Full-time', 'Design Systems', 'B2B'],
      postedAt: new Date(Date.now() - 2 * 86400_000),
    },
  ],
  Vercel: [
    {
      title: 'Staff Frontend Engineer — Growth',
      location: 'Remote — Americas',
      remote: true,
      salaryMin: 200_000,
      salaryMax: 280_000,
      currency: 'USD',
      salaryPeriod: 'year',
      url: 'https://vercel.com/careers/staff-frontend-engineer',
      description: 'Lead the growth-engineering team on the marketing surface and on-boarding flows.',
      tags: ['React', 'Next.js', 'Senior'],
      postedAt: new Date(Date.now() - 5 * 86400_000),
    },
  ],
  Linear: [
    {
      title: 'Product Designer (Mid-level)',
      location: 'Remote — Europe',
      remote: true,
      salaryMin: 110_000,
      salaryMax: 160_000,
      currency: 'EUR',
      salaryPeriod: 'year',
      url: 'https://linear.app/careers/product-designer',
      description: 'Shape Linear\'s timeline, cycle, and project surfaces alongside an opinionated design team.',
      tags: ['Product', 'Visual', 'Remote'],
      postedAt: new Date(Date.now() - 3 * 86400_000),
    },
  ],
  Anthropic: [
    {
      title: 'Design Engineer',
      location: 'San Francisco / Remote',
      remote: true,
      salaryMin: 220_000,
      salaryMax: 320_000,
      currency: 'USD',
      salaryPeriod: 'year',
      url: 'https://anthropic.com/careers/design-engineer',
      description: 'Build product UI for Claude across web and platform surfaces.',
      tags: ['AI', 'Frontend', 'Hybrid'],
      postedAt: new Date(Date.now() - 12 * 3600_000),
    },
  ],
  Flutterwave: [
    {
      title: 'Lead Designer — Africa Team',
      location: 'Lagos, NG',
      remote: false,
      salaryMin: 22_000_000,
      salaryMax: 30_000_000,
      currency: 'NGN',
      salaryPeriod: 'month',
      url: 'https://flutterwave.com/jobs/lead-designer',
      description: 'Own design across our flagship payments stack with a Lagos-based team.',
      tags: ['Fintech', 'Africa', 'Lead'],
      postedAt: new Date(Date.now() - 7 * 86400_000),
    },
  ],
  Kuda: [
    {
      title: 'Senior UX Designer — Banking',
      location: 'Lagos / Remote',
      remote: true,
      salaryMin: 8_000_000,
      salaryMax: 12_000_000,
      currency: 'NGN',
      salaryPeriod: 'month',
      url: 'https://kuda.com/careers/senior-ux-designer',
      description: 'Lead UX for our retail banking app — currently the most-downloaded fintech in Nigeria.',
      tags: ['Fintech', 'Mobile'],
      postedAt: new Date(Date.now() - 1 * 86400_000),
    },
  ],
  Notion: [
    {
      title: 'Brand Designer — Marketing',
      location: 'New York, NY',
      remote: false,
      salaryMin: 130_000,
      salaryMax: 175_000,
      currency: 'USD',
      salaryPeriod: 'year',
      url: 'https://notion.so/careers/brand-designer-marketing',
      description: 'Push our visual identity across launches, campaigns, and editorial surfaces.',
      tags: ['Brand', 'Marketing', 'In-office'],
      postedAt: new Date(Date.now() - 5 * 86400_000),
    },
  ],
  Airbnb: [
    {
      title: 'Senior Product Designer — Hosts',
      location: 'Remote — US',
      remote: true,
      salaryMin: 175_000,
      salaryMax: 230_000,
      currency: 'USD',
      salaryPeriod: 'year',
      url: 'https://careers.airbnb.com/positions/host-experience-designer',
      description: 'Design the host calendar, pricing, and listing-quality surfaces.',
      tags: ['Senior', 'Product', 'Remote'],
      postedAt: new Date(Date.now() - 4 * 86400_000),
    },
  ],
  Paystack: [
    {
      title: 'Backend Engineer — Payments',
      location: 'Lagos, NG',
      remote: false,
      salaryMin: 6_000_000,
      salaryMax: 9_000_000,
      currency: 'NGN',
      salaryPeriod: 'month',
      url: 'https://paystack.com/careers/backend-engineer',
      description: 'Build core ledger services that power Paystack\'s payments rails.',
      tags: ['Backend', 'Fintech'],
      postedAt: new Date(Date.now() - 9 * 86400_000),
    },
  ],
};

@Injectable()
export class FixtureCareerAdapter implements CareerAdapter {
  readonly id = 'fixture';

  async fetch(
    company: { id: string; name: string; careerUrl: string; selector: string | null },
    ctx: CareerAdapterContext,
  ): Promise<RawJob[]> {
    const slice = FIXTURE_JOBS[company.name] ?? [];
    if (slice.length === 0) {
      return [
        {
          title: `${ctx.role || 'Generalist'} — sample listing`,
          location: ctx.country ?? 'Remote',
          remote: ctx.remoteOnly,
          salaryMin: 80_000,
          salaryMax: 140_000,
          currency: 'USD',
          salaryPeriod: 'year',
          url: `https://${company.careerUrl}`,
          description: `Sample listing for ${company.name} — wire a real adapter to replace.`,
          tags: ['Sample'],
          postedAt: new Date(),
        },
      ];
    }
    // Honour the remote-only filter so the FE toggle behaves as expected.
    if (ctx.remoteOnly) return slice.filter((j) => j.remote);
    return slice;
  }
}
