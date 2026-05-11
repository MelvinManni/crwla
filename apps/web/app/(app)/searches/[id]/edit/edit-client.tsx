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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { KeywordInput } from '@/components/keyword-input';
import { CronPicker } from '@/components/cron-picker';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { CronPreset, SearchView } from '@/lib/types';

export function EditSearchClient({ initial }: { initial: SearchView }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initial.name);
  const [keywords, setKeywords] = useState<string[]>(initial.keywords);
  const [cron, setCron] = useState<CronPreset>(initial.cron);
  const [filterPrompt, setFilterPrompt] = useState(initial.filterPrompt);
  const [paused, setPaused] = useState(initial.status === 'PAUSED');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);

  async function save() {
    setBusy('save');
    try {
      await api.patch(`/searches/${initial.id}`, {
        name: name.trim(),
        keywords,
        cron,
        filterPrompt,
        status: paused ? 'PAUSED' : 'RUNNING',
      });
      toast({ title: 'Saved' });
      router.push(`/searches/${initial.id}` as never);
      router.refresh();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy('delete');
    try {
      await api.delete(`/searches/${initial.id}`);
      toast({ title: 'Deleted' });
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Button render={<Link href={`/searches/${initial.id}`} />} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive" size="sm" disabled={busy !== null} />}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this search?</AlertDialogTitle>
                <AlertDialogDescription>
                  All run history and stored results will be removed. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>
                  {busy === 'delete' ? <Spinner /> : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={save} disabled={busy !== null} loading={busy === 'save'}>
            Save
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

        {initial.sources.length > 0 && (
          <div className="space-y-1.5">
            <Label>Sources</Label>
            <div className="rounded-lg border border-border bg-bg-elev px-3 py-2.5">
              <p className="font-mono text-[11px] text-fg">
                {initial.sources.join(' · ')}
              </p>
              <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                Snapshotted at create time. Determined by your subscription — recreate the
                search after upgrading to pick up new sources.
              </p>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}
