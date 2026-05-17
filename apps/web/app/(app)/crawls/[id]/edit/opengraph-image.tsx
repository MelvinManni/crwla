import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Edit crawl';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Dynamic placeholder — step-2 will pass the crawl name as `title`.
export default function Image(_: {
  params: Promise<{ id: string }>;
}) {
  return renderOg(
    <DefaultOg caption="CRWLA / CRAWLS / EDIT" title="Edit crawl" />,
  );
}
