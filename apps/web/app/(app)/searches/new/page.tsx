import { redirect } from 'next/navigation';

// The standalone "new search" page has been replaced by a modal. Anyone
// hitting this URL (old bookmarks, sidebar links from cached pages) is sent
// to the dashboard with `?new=1`, which StartCrawlProvider detects and opens
// the modal.
export default function NewCrawlRedirectPage() {
  redirect('/dashboard?new=1');
}
