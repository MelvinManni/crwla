import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Search everything, all at once';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderOg(
    <DefaultOg
      caption="CRWLA / HOME"
      title="Search everything, all at once."
      subtitle="Keyword-driven web research aggregator. No more 80 open tabs."
    />,
  );
}
