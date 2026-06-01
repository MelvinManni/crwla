import type { Metadata } from 'next';
import { redirectIfSession } from '@/lib/auth';
import {
  JsonLd,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from '@/components/metadata/JsonLd';
import { SITE_URL } from '@/lib/seo';
import { LandingClient } from './landing-client';

const description =
  'Paste hundreds of keywords. Watch them land in one live dashboard. No more 80 open tabs.';

export const metadata: Metadata = {
  title: { absolute: 'CRWLA — Search everything, all at once' },
  description,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'CRWLA — Search everything, all at once',
    description,
    url: SITE_URL,
  },
  twitter: {
    title: 'CRWLA — Search everything, all at once',
    description,
  },
};

export default async function LandingPage() {
  await redirectIfSession();
  return (
    <>
      <JsonLd data={[organizationSchema, websiteSchema, softwareApplicationSchema]} />
      <LandingClient />
    </>
  );
}
