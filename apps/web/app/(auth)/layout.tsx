import { redirectIfSession } from '@/lib/auth';

// Server component — kicks an already-signed-in visitor over to
// /dashboard before any auth page renders. /signin and /request-access
// only become reachable again after the user signs out.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfSession();
  return <>{children}</>;
}
