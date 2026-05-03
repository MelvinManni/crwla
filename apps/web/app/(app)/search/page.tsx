import { requireSession } from '@/lib/auth';
import { SearchClient } from './search-client';

export default async function SearchPage() {
  await requireSession();
  return <SearchClient />;
}
