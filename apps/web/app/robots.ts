import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

// Lets crawlers index the public marketing pages while keeping the
// authenticated app, account flows, and transactional pages out of search.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/search',
        '/crawls',
        '/alerts',
        '/billing',
        '/profile',
        '/admin',
        '/signin',
        '/signup',
        '/request-access',
        '/verify-email',
        '/digest',
        '/api/',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
