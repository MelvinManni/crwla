import type { Metadata } from 'next';
import { ContactClient } from './contact-client';

const description =
  'Get in touch with the CRWLA team — book a demo, ask about team plans and integrations, or reach sales, support, and press.';

export const metadata: Metadata = {
  title: 'Contact',
  description,
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact CRWLA',
    description,
    url: '/contact',
  },
  twitter: {
    title: 'Contact CRWLA',
    description,
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
