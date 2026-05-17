import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Pricing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderOg(
    <DefaultOg
      caption="CRWLA / PRICING"
      title="Pay for the search. Not the ads."
      subtitle="One subscription. No sponsored results. Cancel any time."
    />,
  );
}
