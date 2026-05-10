import { requireSession } from '@/lib/auth';

export default async function SearchPage() {
  await requireSession();
  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Recent results</h1>
      <p className="mt-2 text-[13px] text-fg-muted">Coming soon.</p>
    </div>
  );
}
