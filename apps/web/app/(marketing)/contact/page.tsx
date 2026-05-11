import type { Metadata } from 'next';
import { ContactClient } from './contact-client';

export const metadata: Metadata = {
  title: 'Contact — CRWLA',
  description: 'Get in touch with the CRWLA team.',
};

export default function ContactPage() {
  return <ContactClient />;
}
