'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { KeywordInput } from '@/components/keyword-input';
import { CronPicker } from '@/components/cron-picker';
import { api } from '@/lib/api';
import type { CronPreset, SearchView } from '@/lib/types';

export function EditSearchClient({ initial }: { initial: SearchView }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [keywords, setKeywords] = useState<string[]>(initial.keywords);
  const [cron, setCron] = useState<CronPreset>(initial.cron);
  const [filterPrompt, setFilterPrompt] = useState(initial.filterPrompt);
  const [paused, setPaused] = useState(initial.status === 'PAUSED');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/searches/${initial.id}`, {
        name: name.trim(),
        keywords,
        cron,
        filterPrompt,
        status: paused ? 'PAUSED' : 'RUNNING',
      });
      router.push(`/searches/${initial.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this search and all its results? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.delete(`/searches/${initial.id}`);
      router.push('/dashboard');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/searches/${initial.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={remove} disabled={busy}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? <Spinner /> : 'Save'}
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Edit search</h1>

      <div className="mt-6 space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Keywords</Label>
          <KeywordInput value={keywords} onChange={setKeywords} />
        </div>

        <div className="space-y-1.5">
          <Label>Schedule</Label>
          <CronPicker value={cron} onChange={setCron} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter">Filter prompt</Label>
          <Textarea id="filter" value={filterPrompt} onChange={(e) => setFilterPrompt(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          Pause this search (keeps results, stops scheduling)
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
