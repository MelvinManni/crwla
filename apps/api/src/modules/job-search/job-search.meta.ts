/**
 * Server-owned reference data for Job Search. Same rationale as
 * pricing-crawla.meta.ts — keep static lists on the server so the FE
 * doesn't carry the catalog.
 */

export const JOB_COUNTRIES: ReadonlyArray<{
  code: string;
  name: string;
  flag: string;
}> = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
];

export const HOT_TITLES_FALLBACK: ReadonlyArray<string> = [
  'Senior Frontend Engineer',
  'Product Designer',
  'AI Researcher',
  'Staff PM',
  'Design Engineer',
  'DevRel',
];
