import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Alerts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderOg(
    <DefaultOg
      caption="CRWLA / ALERTS"
      title="Alerts when it matters"
      subtitle="Email, SMS, or WhatsApp the moment a keyword hits."
    />,
  );
}
