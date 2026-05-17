'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Copy, Info, Trash2 } from 'lucide-react';
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
import {
  useDeleteCrawl,
  useDisableCrawlShare,
  useEnableCrawlShare,
  useUpdateCrawl,
} from '@/lib/queries/crawls';
import {
  PlanLock,
  useEntitlements,
} from '@/components/billing/entitlements-provider';
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
  const [publicAccess, setPublicAccess] = useState(initial.publicAccess);
  const [shareSlug, setShareSlug] = useState<string | null>(initial.shareSlug);
  const enableShare = useEnableCrawlShare();
  const disableShare = useDisableCrawlShare();
  const keywordCap = ent?.limits.keywordsPerSearch;
  const canShare = ent?.limits.resultSharing ?? false;

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
        publicAccess,
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

  function togglePublic(next: boolean) {
    // Optimistic state: the actual entitlement check + persistence happens
    // on save (PATCH). Block the UI flip for plans below Pro so the toast
    // routes to the upgrade modal instead of a 403 on save.
    if (next && !canShare) {
      showLimit({
        reason: 'Sharing crawl results is a Pro feature.',
        recommendedTier: 'Pro',
      });
      return;
    }
    setPublicAccess(next);
    // When the user toggles ON for the first time, mint a slug now so the
    // copy-link button has something to show before they hit Save. If they
    // toggle OFF, keep the slug — server keeps it too so re-enabling reuses
    // the same URL.
    if (next && !shareSlug) {
      enableShare.mutate(initial.id, {
        onSuccess: (s) => setShareSlug(s.shareSlug),
        onError: (e) => {
          setPublicAccess(false);
          toast({
            title: 'Share failed',
            description: (e as Error).message,
            variant: 'destructive',
          });
        },
      });
    }
    if (!next && shareSlug) {
      // Revoke server-side immediately so a stale shared link starts
      // returning the limited-access view even if the user navigates away
      // without saving the rest of the form.
      disableShare.mutate(initial.id, {
        onError: (e) =>
          toast({
            title: 'Revoke failed',
            description: (e as Error).message,
            variant: 'destructive',
          }),
      });
    }
  }

  function copyShareUrl() {
    if (!shareSlug) return;
    const url = `${window.location.origin}/p/${shareSlug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast({ title: 'Link copied', description: url }))
      .catch(() =>
        toast({ title: 'Copy failed', variant: 'destructive', description: url }),
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

        <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="public-access" className="cursor-pointer">
                Public access
              </Label>
              <PlanLock unlocked={canShare} requires="Pro" />
              <TooltipGroup
                message={
                  <span>
                    Turn on to share this crawl&apos;s results at{' '}
                    <code>/p/&lt;slug&gt;</code>. Turn off to revoke — shared
                    links stop working immediately.
                  </span>
                }
              >
                <button
                  type="button"
                  aria-label="What is public access?"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Info size={14} aria-hidden />
                </button>
              </TooltipGroup>
            </div>
            <Switch
              id="public-access"
              checked={publicAccess}
              onCheckedChange={togglePublic}
              disabled={enableShare.isPending || disableShare.isPending}
            />
          </div>
          {publicAccess && shareSlug && (
            <div className="flex items-center gap-2 border-t border-dashed border-border pt-2">
              <code className="flex-1 overflow-hidden truncate rounded bg-bg-sunk px-2 py-1 font-mono text-[11px] text-fg-muted">
                /p/{shareSlug}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyShareUrl}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
            </div>
          )}
          {!publicAccess && shareSlug && (
            <p className="border-t border-dashed border-border pt-2 font-mono text-[10px] text-fg-subtle">
              Shared links revoked. Toggle back on to re-enable /p/{shareSlug}.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          Pause this search (keeps results, stops scheduling)
        </label>
      </div>
    </div>
  );
}
