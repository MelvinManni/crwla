import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Start a new crawl';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderOg(
    <DefaultOg
      caption="CRWLA / CRAWLS / NEW"
      title="Start a new crawl"
      subtitle="Paste keywords. Pick a schedule. CRWLA does the rest."
    />,
  );
}
