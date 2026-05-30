import DefaultOg from '@/components/metadata/DefaultOg';
import { renderOg } from '@/lib/og/render';

export const alt = 'CRWLA — Verify your email';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderOg(
    <DefaultOg
      caption="CRWLA / VERIFY EMAIL"
      title="Verify your email"
      subtitle="Confirm your address to finish setting up your account."
    />,
  );
}
