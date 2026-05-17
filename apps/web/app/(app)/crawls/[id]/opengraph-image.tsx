import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Crawl';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Dynamic placeholder: when step-2 designs land, this will fetch the
// crawl name / keywordCount / resultCount via a small server-only API
// call and pass them as props. Kept generic for now so social previews
// always have a usable card.
export default function Image(_: {
  params: Promise<{ id: string }>;
}) {
  return renderOg(<DefaultOg caption="CRWLA / CRAWLS" title="Crawl" />);
}
