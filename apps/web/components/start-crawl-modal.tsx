'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { KeywordInput } from '@/components/keyword-input';
import { CronPicker } from '@/components/cron-picker';
import { useEntitlements } from '@/components/billing/entitlements-provider';
import { useCreateCrawl } from '@/lib/queries/crawls';
import type { CronPreset } from '@/lib/types';

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

type Ctx = {
  open: () => void;
  close: () => void;
};

const StartCrawlContext = createContext<Ctx | null>(null);

export function useStartCrawl() {
  const ctx = useContext(StartCrawlContext);
  if (!ctx) throw new Error('useStartCrawl must be used within StartCrawlProvider');
  return ctx;
}

export function StartCrawlProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Auto-open when any page is hit with `?new=1`, then strip the param so a
  // refresh doesn't re-trigger the modal.
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setIsOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('new');
    const qs = next.toString();
    router.replace((qs ? `${pathname}?${qs}` : pathname) as never);
  }, [searchParams, pathname, router]);

  return (
    <StartCrawlContext.Provider value={{ open, close }}>
      {children}
      <StartCrawlDialog open={isOpen} onOpenChange={setIsOpen} />
    </StartCrawlContext.Provider>
  );
}

function StartCrawlDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { ent } = useEntitlements();
  const createCrawl = useCreateCrawl();
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [cron, setCron] = useState<CronPreset>('DAILY');
  const [cronTouched, setCronTouched] = useState(false);
  const [filterPrompt, setFilterPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setName('');
      setKeywords([]);
      setCronTouched(false);
      setFilterPrompt('');
      setError(null);
      createCrawl.reset();
    }
    // We intentionally only react to `open` toggling — resetting on every
    // render of the mutation would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!cronTouched && ent) setCron(pickDefaultCron(ent.limits.cron));
  }, [ent, cronTouched]);

  const allowed = ent?.limits.allowedSourceCategories ?? [];
  const busy = createCrawl.isPending;

  function submit() {
    setError(null);
    if (!name.trim()) return setError('Name is required.');
    if (keywords.length === 0) return setError('Add at least one keyword.');
    createCrawl.mutate(
      { name: name.trim(), keywords, cron, filterPrompt },
      {
        onSuccess: (out) => {
          onOpenChange(false);
          router.push(`/crawls/${out.job.id}` as never);
        },
        onError: (e) => setError((e as Error).message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[calc(100vw-40px)] max-w-[540px] max-h-[calc(100vh-40px)] flex-col gap-0 p-0 overflow-y-auto rounded-lg">
        <DialogHeader className="shrink-0 border-b border-border bg-background px-6 py-4">
          <DialogTitle>Start a crawl</DialogTitle>
          <DialogDescription>
            Pick keywords, a schedule, and we'll crawl them for you.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="crawl-name">Name</Label>
            <Input
              id="crawl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI Funding Tracker"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Keywords</Label>
            <KeywordInput value={keywords} onChange={setKeywords} />
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
            <Label htmlFor="crawl-filter">
              Filter prompt{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="crawl-filter"
              value={filterPrompt}
              onChange={(e) => setFilterPrompt(e.target.value)}
              placeholder="Tell the model what to keep — e.g. only rounds above $5M."
              rows={3}
            />
          </div>

          {allowed.length > 0 && (
            <p className="font-mono text-[11px] text-fg-subtle">
              Sources from your {ent?.plan.name ?? ''} plan:{' '}
              {allowed.map((c) => CATEGORY_LABEL[c] ?? c).join(', ')}.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border bg-background px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={busy}>
            Start crawl
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
