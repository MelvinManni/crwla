/**
 * Server-owned reference data for Pricing Crawla. Lives here (not the FE)
 * so the FE doesn't carry business decisions like "which countries ship
 * to" or "which categories exist." Bumping the list ships without a FE
 * release.
 */

export const PRICING_COUNTRIES: ReadonlyArray<{
  code: string;
  name: string;
  flag: string;
}> = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
];

export const PRICING_CATEGORIES: ReadonlyArray<string> = [
  'Electronics',
  'Phones',
  'Laptops',
  'Audio',
  'Fashion',
  'Home',
  'Beauty',
  'Books',
  'Gaming',
  'Wearables',
];

/**
 * Fallback trending queries — used when the DB doesn't yet have enough
 * data to derive trending. The /meta endpoint always tries the DB first.
 */
export const PRICING_TRENDING_FALLBACK: ReadonlyArray<{ q: string; hot?: boolean }> = [
  { q: 'iPhone 15 Pro Max', hot: true },
  { q: 'Samsung S24 Ultra', hot: true },
  { q: 'AirPods Pro 2' },
  { q: 'PlayStation 5 Slim' },
  { q: 'MacBook Air M3' },
  { q: 'Sony WH-1000XM5' },
];
