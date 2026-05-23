import type { Metadata } from 'next';
import { redirectIfSession } from '@/lib/auth';
import { LandingClient } from './landing-client';

export const metadata: Metadata = {
  title: 'CRWLA — Search everything, all at once',
  description: 'Paste hundreds of keywords. Watch them land in one live dashboard. No more 80 open tabs.',
};

export default async function LandingPage() {
  await redirectIfSession();
  return <LandingClient />;
}
