import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — About';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderOg(
    <DefaultOg
      caption="CRWLA / ABOUT"
      title="We were tired of opening tabs."
      subtitle="So we built CRWLA."
    />,
  );
}
