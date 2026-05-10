'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { KeywordInput } from '@/components/keyword-input';
import { CronPicker } from '@/components/cron-picker';
import { useEntitlements } from '@/components/billing/entitlements-provider';
import { api } from '@/lib/api';
import type { CronPreset, SearchView } from '@/lib/types';

const CRON_PRIORITY: CronPreset[] = ['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL'];
const CATEGORY_LABEL: Record<string, string> = {
  news: 'News',
  social: 'Social',
  forums: 'Forums',
  blogs: 'Blogs',
};

function pickDefaultCron(allowed: ReadonlyArray<string> | undefined): CronPreset {
  if (!allowed || allowed.length === 0) return 'DAILY';
  return CRON_PRIORITY.find((p) => allowed.includes(p)) ?? 'MANUAL';
}

export default function NewSearchPage() {
  const router = useRouter();
  const { ent } = useEntitlements();
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [cron, setCron] = useState<CronPreset>('DAILY');
  const [cronTouched, setCronTouched] = useState(false);
  const [filterPrompt, setFilterPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cronTouched && ent) setCron(pickDefaultCron(ent.limits.cron));
  }, [ent, cronTouched]);

  async function save() {
    setError(null);
    if (!name.trim()) return setError('name required');
    if (keywords.length === 0) return setError('add at least one keyword');
    setBusy(true);
    try {
      const out = await api.post<{ job: SearchView }>('/searches', {
        name: name.trim(),
        keywords,
        cron,
        filterPrompt,
      });
      router.push(`/searches/${out.job.id}` as never);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Sources are server-derived from the user's plan. Show a read-only
  // summary so the user knows what's about to run.
  const allowed = ent?.limits.allowedSourceCategories ?? [];

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Button render={<Link href="/dashboard" />} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? <Spinner /> : 'Save'}
        </Button>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">New search</h1>

      <div className="mt-6 space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AI Funding Tracker"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Keywords</Label>
          <KeywordInput value={keywords} onChange={setKeywords} />
          <p className="text-xs text-muted-foreground">
            Each keyword runs as a separate query. Use quotes for exact phrases.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Sources</Label>
          <div className="rounded-lg border border-border bg-bg-elev px-3 py-2.5">
            {allowed.length === 0 ? (
              <p className="font-mono text-[11px] text-fg-subtle">Loading…</p>
            ) : (
              <>
                <p className="text-[12px] text-fg">
                  Your <span className="font-medium">{ent?.plan.name ?? ''}</span> plan covers{' '}
                  {allowed.map((c, i) => (
                    <span key={c}>
                      <span className="font-mono text-[11px] text-fg">
                        {CATEGORY_LABEL[c] ?? c}
                      </span>
                      {i < allowed.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                  .
                </p>
                <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                  Sources are determined by your subscription. Upgrade your plan to add more
                  source categories.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Schedule</Label>
          <CronPicker
            value={cron}
            onChange={(next) => {
              setCronTouched(true);
              setCron(next);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter">
            Filter prompt <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="filter"
            value={filterPrompt}
            onChange={(e) => setFilterPrompt(e.target.value)}
            placeholder="Tell the model what to keep — e.g. only include rounds above $5M, skip rumors, surface only North American companies."
          />
          <p className="text-xs text-muted-foreground">Applied to every result before it shows up.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
