import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Pause digest';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Static card — this route is reached from the digest email's one-click
// "Pause digest" link, so there's no per-crawl data to render here.
export default function Image() {
  return renderOg(
    <DefaultOg
      caption="CRWLA / DIGEST"
      title="Digest paused"
      subtitle="You won't get digest emails for this crawl. Turn them back on anytime from its settings."
    />,
  );
}
