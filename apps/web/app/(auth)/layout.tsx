import { redirectIfSession } from '@/lib/auth';
import { RecaptchaProvider } from '@/components/auth/recaptcha-provider';

// Server component — kicks an already-signed-in visitor over to
// /dashboard before any auth page renders. /signin and /request-access
// only become reachable again after the user signs out.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfSession();
  // RecaptchaProvider loads the v3 script for signin/signup (no-op without a
  // site key configured).
  return <RecaptchaProvider>{children}</RecaptchaProvider>;
}
