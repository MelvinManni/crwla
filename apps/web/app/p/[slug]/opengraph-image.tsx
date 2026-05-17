import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Shared crawl';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Dynamic placeholder — this is the highest-impact OG card (strangers
// land here from shared links). Step 2 will fetch
//   `GET /api/p/{slug}` → { search: { name, ownerName, keywordCount, ... } }
// and pipe those into a dedicated SharedCrawlOg component.
export default function Image(_: {
  params: Promise<{ slug: string }>;
}) {
  return renderOg(
    <DefaultOg
      caption="CRWLA / SHARED"
      title="Shared crawl"
      subtitle="A research feed someone is sharing with you via CRWLA."
    />,
  );
}
