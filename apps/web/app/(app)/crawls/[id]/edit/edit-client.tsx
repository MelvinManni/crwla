'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import TooltipGroup from '@/components/tooltip-group';
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
import { useDeleteCrawl, useUpdateCrawl } from '@/lib/queries/crawls';
import { useEntitlements } from '@/components/billing/entitlements-provider';
import { useUpgradeModal } from '@/components/billing/upgrade-modal';
import type { CronPreset, SearchView } from '@/lib/types';

export function EditSearchClient({ initial }: { initial: SearchView }) {
  const router = useRouter();
  const { toast } = useToast();
  const { ent } = useEntitlements();
  const { showLimit } = useUpgradeModal();
  const update = useUpdateCrawl();
  const remove = useDeleteCrawl();
  const [name, setName] = useState(initial.name);
  const [keywords, setKeywords] = useState<string[]>(initial.keywords);
  const [cron, setCron] = useState<CronPreset>(initial.cron);
  const [filterPrompt, setFilterPrompt] = useState(initial.filterPrompt);
  const [strict, setStrict] = useState(initial.strict);
  const [paused, setPaused] = useState(initial.status === 'PAUSED');
  const keywordCap = ent?.limits.keywordsPerSearch;

  function onKeywordCapExceeded(attempted: number) {
    if (typeof keywordCap !== 'number') return;
    const planName = ent?.plan.name ?? 'your plan';
    showLimit({
      reason: `${planName} allows ${keywordCap} keyword${
        keywordCap === 1 ? '' : 's'
      } per crawl — ${attempted - keywordCap} dropped. Upgrade to add more.`,
      recommendedTier: 'Pro',
    });
  }

  const saving = update.isPending;
  const deleting = remove.isPending;
  const anyBusy = saving || deleting;

  function save() {
    update.mutate(
      {
        id: initial.id,
        name: name.trim(),
        keywords,
        cron,
        filterPrompt,
        strict,
        status: paused ? 'PAUSED' : 'RUNNING',
      },
      {
        onSuccess: () => {
          toast({ title: 'Saved' });
          router.push(`/crawls/${initial.id}` as never);
        },
        onError: (e) =>
          toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  }

  function onDelete() {
    remove.mutate(initial.id, {
      onSuccess: () => {
        toast({ title: 'Deleted' });
        router.push('/dashboard');
      },
      onError: (e) =>
        toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' }),
    });
  }

  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Button render={<Link href={`/crawls/${initial.id}`} />} variant="ghost">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive" disabled={anyBusy} />}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this crawl?</AlertDialogTitle>
                <AlertDialogDescription>
                  All run history and stored results will be removed. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  {deleting ? <Spinner /> : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={save} disabled={anyBusy} loading={saving}>
            Save
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Edit crawl</h1>

      <div className="mt-6 space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>
            Keywords
            {typeof keywordCap === 'number' && (
              <span className="ml-1 font-mono text-[11px] font-normal text-fg-subtle">
                {keywords.length}/{keywordCap}
              </span>
            )}
          </Label>
          <KeywordInput
            value={keywords}
            onChange={setKeywords}
            max={keywordCap}
            onMaxExceeded={onKeywordCapExceeded}
          />
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

        <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="strict" className="cursor-pointer">
              Strict mode
            </Label>
            <TooltipGroup
              message={
                <span>
                  Only keeps results that contain <strong>all</strong> of your keywords
                  in the title or snippet. Applied on the next run.
                </span>
              }
            >
              <button
                type="button"
                aria-label="What is strict mode?"
                className="text-muted-foreground hover:text-foreground"
              >
                <Info size={14} aria-hidden />
              </button>
            </TooltipGroup>
          </div>
          <Switch id="strict" checked={strict} onCheckedChange={setStrict} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          Pause this search (keeps results, stops scheduling)
        </label>
      </div>
    </div>
  );
}
