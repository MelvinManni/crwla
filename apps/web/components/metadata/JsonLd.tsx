// Structured data (JSON-LD) for the marketing site. Google uses this to
// understand the organization and product behind the pages and to enable
// richer search results. Rendered inline via a <script type="application/ld+json">.
//
// See https://developers.google.com/search/docs/appearance/structured-data
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo';

type JsonLdProps = {
  /** One schema.org object, or an array rendered as an @graph. */
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
  const json = Array.isArray(data)
    ? { '@context': 'https://schema.org', '@graph': data }
    : { '@context': 'https://schema.org', ...data };

  return (
    <script
      type="application/ld+json"
      // Content is fully static and authored here — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

/** Identity of the company — referenced by other nodes via @id. */
export const organizationSchema = {
  '@type': 'Organization',
  '@id': absoluteUrl('/#organization'),
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl('/opengraph-image'),
  description:
    'CRWLA is a keyword-driven web research aggregator that runs hundreds of keywords across the web, social, news, and blogs in parallel.',
  email: 'hello@crwla.com',
  contactPoint: [
    {
      '@type': 'ContactPoint',
      email: 'sales@crwla.com',
      contactType: 'sales',
    },
    {
      '@type': 'ContactPoint',
      email: 'hello@crwla.com',
      contactType: 'customer support',
    },
  ],
};

/** The website itself, with a sitelinks-style search action. */
export const websiteSchema = {
  '@type': 'WebSite',
  '@id': absoluteUrl('/#website'),
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { '@id': absoluteUrl('/#organization') },
};

/** The product, for SoftwareApplication rich results. */
export const softwareApplicationSchema = {
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description:
    'Paste hundreds of keywords and watch results from the web, social, news, and blogs land in one live dashboard.',
  publisher: { '@id': absoluteUrl('/#organization') },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier with 50 searches a day. No card required.',
  },
};
