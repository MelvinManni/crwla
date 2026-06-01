import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/queries/client";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CRWLA — Search everything, all at once",
    template: "%s · CRWLA",
  },
  description:
    "CRWLA is a keyword-driven web research aggregator. Paste hundreds of keywords and watch results from the web, social, news, and blogs land in one live dashboard.",
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "CRWLA — Search everything, all at once",
    description:
      "Paste hundreds of keywords. Watch them land in one live dashboard. No more 80 open tabs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CRWLA — Search everything, all at once",
    description:
      "Paste hundreds of keywords. Watch them land in one live dashboard. No more 80 open tabs.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased w-screen">
        <QueryProvider>
          {children}
          <SonnerToaster />
        </QueryProvider>
      </body>
    </html>
  );
}
