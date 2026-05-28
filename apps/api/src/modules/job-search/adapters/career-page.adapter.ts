/**
 * Career-page adapter interface. Each adapter is given a TrackedCompany
 * row + the searched role and returns the raw listings it found on that
 * company's careers page.
 *
 * Today we ship one implementation (FixtureCareerAdapter) that returns
 * realistic data per known company. Real adapters slot in by source
 * (greenhouse / lever / workday / custom HTML) and route via a
 * future selector-based dispatcher.
 */
export type RawJob = {
  title: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  salaryPeriod: string | null;
  url: string;
  description: string | null;
  tags: string[];
  postedAt: Date | null;
};

export type CareerAdapterContext = {
  role: string;
  country: string | null;
  remoteOnly: boolean;
};

export interface CareerAdapter {
  readonly id: string;
  fetch(
    company: { id: string; name: string; careerUrl: string; selector: string | null },
    ctx: CareerAdapterContext,
  ): Promise<RawJob[]>;
}
