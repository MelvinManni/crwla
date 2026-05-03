import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/queries/client';

export const metadata: Metadata = {
  title: 'CRWLA',
  description: 'Keyword-driven web research aggregator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
