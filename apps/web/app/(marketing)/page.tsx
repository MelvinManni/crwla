import type { Metadata } from 'next';
import { LandingClient } from './landing-client';

export const metadata: Metadata = {
  title: 'CRWLA — Search everything, all at once',
  description: 'Paste hundreds of keywords. Watch them land in one live dashboard. No more 80 open tabs.',
};

export default function LandingPage() {
  return <LandingClient />;
}
