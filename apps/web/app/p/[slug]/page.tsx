import { api } from '@/lib/api';
import type { SharedSearchView } from '@/lib/types';
import { LimitedAccessPage } from './limited-access';
import { SharedResultsView } from './shared-results';

export const dynamic = 'force-dynamic';

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // No cookie passed — this endpoint is intentionally public. A 404 from
  // the API means either the slug is unknown or the owner toggled public
  // access off; both should render the same limited-access page so we
  // don't leak slug existence.
  let data: SharedSearchView | null = null;
  try {
    data = await api.get<SharedSearchView>(`/p/${slug}`);
  } catch {
    data = null;
  }

  if (!data) {
    return <LimitedAccessPage />;
  }

  return <SharedResultsView data={data} />;
}
