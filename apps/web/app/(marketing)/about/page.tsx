import type { Metadata } from 'next';
import { AboutClient } from './about-client';

export const metadata: Metadata = {
  title: 'About — CRWLA',
  description: 'We were tired of opening tabs. So we built CRWLA.',
};

export default function AboutPage() {
  return <AboutClient />;
}
