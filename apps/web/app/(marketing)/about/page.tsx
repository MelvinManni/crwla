import type { Metadata } from 'next';
import { AboutClient } from './about-client';

const description =
  'We were tired of opening 80 tabs to research one question — so we built CRWLA, a parallel keyword search aggregator. Meet the team and the story behind it.';

export const metadata: Metadata = {
  title: 'About',
  description,
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About CRWLA',
    description,
    url: '/about',
  },
  twitter: {
    title: 'About CRWLA',
    description,
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
