'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { KeywordInput } from '@/components/keyword-input';
import { CronPicker } from '@/components/cron-picker';
import { api } from '@/lib/api';
import type { CronPreset, SearchView } from '@/lib/types';

export default function NewSearchPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [cron, setCron] = useState<CronPreset>('DAILY');
  const [filterPrompt, setFilterPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.push(`/searches/${out.job.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
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
          <Label>Schedule</Label>
          <CronPicker value={cron} onChange={setCron} />
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
