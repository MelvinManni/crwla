import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Request access';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderOg(
    <DefaultOg
      caption="CRWLA / REQUEST ACCESS"
      title="Request access"
      subtitle="Tell us about your work and we'll get you in."
    />,
  );
}
