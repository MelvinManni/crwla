'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSavePlan, type SavePlanResponse } from '@/lib/queries/admin';
import { cn } from '@/lib/utils';
import type { AdminPlan } from './admin-billing-client';

const CRON_OPTIONS = ['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL', 'CUSTOM'] as const;
const SOURCE_CATEGORIES = ['news', 'social', 'forums', 'blogs'] as const;
const EXPORT_FORMATS = ['csv', 'xlsx', 'json', 'pdf'] as const;

// Field-level shape for plan limits. Raw JSON in the DB is the union of
// these; the editor needs a fully-typed object so each control can bind
// to a discrete piece of state. Every visible feature bullet derives
// from this — there's no separate features array anymore.
type Limits = {
  savedSearches: number;
  keywordsPerSearch: number;
  bulkKeywordImport: number;
  manualRunsPerMonth: number;
  scheduledRunsPerSearchPerMonth: number;
  emailAlerts: number;
  smsAlertsPerMonth: number;
  whatsappAlertsPerMonth: number;
  resultHistoryDays: number;
  cron: string[];
  allowedSourceCategories: string[];
  exportFormats: string[];
  // Capability flags
  webhooks: boolean;
  apiAccess: boolean;
  customEmailDomain: boolean;
  scheduledExports: boolean;
  resultSharing: boolean;
  teamSeats: number;
  prioritySupport: boolean;
  uptimeSLA: boolean;
  // Marketing-bullet flags
  smartFiltering: boolean;
  keywordGenerator: boolean;
  repeatedWordIdentification: boolean;
  locationSearch: boolean;
  sharedSearches: boolean;
  rbac: boolean;
  emailSupport: boolean;
  communitySupport: boolean;
};

const DEFAULT_LIMITS: Limits = {
  savedSearches: 0,
  keywordsPerSearch: 0,
  bulkKeywordImport: 0,
  manualRunsPerMonth: 0,
  scheduledRunsPerSearchPerMonth: 0,
  emailAlerts: 0,
  smsAlertsPerMonth: 0,
  whatsappAlertsPerMonth: 0,
  resultHistoryDays: 0,
  cron: [],
  allowedSourceCategories: [],
  exportFormats: [],
  webhooks: false,
  apiAccess: false,
  customEmailDomain: false,
  scheduledExports: false,
  resultSharing: false,
  teamSeats: 1,
  prioritySupport: false,
  uptimeSLA: false,
  smartFiltering: false,
  keywordGenerator: false,
  repeatedWordIdentification: false,
  locationSearch: false,
  sharedSearches: false,
  rbac: false,
  emailSupport: false,
  communitySupport: false,
};

function readLimits(raw: Record<string, unknown>): Limits {
  return {
    ...DEFAULT_LIMITS,
    ...(raw as Partial<Limits>),
    cron: Array.isArray(raw.cron) ? (raw.cron as string[]) : [],
    allowedSourceCategories: Array.isArray(raw.allowedSourceCategories)
      ? (raw.allowedSourceCategories as string[])
      : [],
    exportFormats: Array.isArray(raw.exportFormats)
      ? (raw.exportFormats as string[])
      : [],
  };
}

export function EditPlanDrawer({
  plan,
  open,
  onClose,
  onSaved,
}: {
  plan: AdminPlan | null;
  open: boolean;
  onClose: () => void;
  onSaved: (next: AdminPlan) => void;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      direction="left"
      shouldScaleBackground={false}
    >
      <DrawerContent className="left-0 right-auto border-l-0 border-r">
        {plan && (
          <EditPlanForm plan={plan} onClose={onClose} onSaved={onSaved} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function EditPlanForm({
  plan,
  onClose,
  onSaved,
}: {
  plan: AdminPlan;
  onClose: () => void;
  onSaved: (next: AdminPlan) => void;
}) {
  const { toast } = useToast();
  const saveMut = useSavePlan();

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [priceMonthly, setPriceMonthly] = useState(
    (plan.priceMonthlyCents / 100).toString(),
  );
  const [priceYearly, setPriceYearly] = useState(
    (plan.priceYearlyCents / 100).toString(),
  );
  const [limits, setLimits] = useState<Limits>(readLimits(plan.limits));
  const busy = saveMut.isPending;

  // Mirror of deriveFeatures() on the API. Kept here so the admin sees
  // their toggles reflected immediately in the Preview pane without a
  // round-trip — the server re-derives on save, this is just a visual.
  const previewFeatures = useMemo(() => deriveFeaturesLocal(limits), [limits]);

  function setLimit<K extends keyof Limits>(key: K, value: Limits[K]) {
    setLimits((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArr(
    key: 'cron' | 'allowedSourceCategories' | 'exportFormats',
    value: string,
  ) {
    setLimits((prev) => {
      const cur = prev[key];
      const next = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      return { ...prev, [key]: next };
    });
  }

  function save() {
    saveMut.mutate(
      {
        id: plan.id,
        name: name.trim(),
        description: description.trim(),
        priceMonthlyCents: Math.round(Number(priceMonthly) * 100),
        priceYearlyCents: Math.round(Number(priceYearly) * 100),
        limits: limits as unknown as Record<string, unknown>,
      },
      {
        onSuccess: (updated: SavePlanResponse) => {
          if (updated.polarSyncError) {
            toast({
              title: 'Saved (Polar sync failed)',
              description: updated.polarSyncError,
              variant: 'destructive',
            });
          } else if (updated.polarProductId) {
            toast({
              title: 'Saved',
              description: `Polar product ${updated.polarProductId.slice(0, 14)}…`,
            });
          } else {
            toast({ title: 'Saved' });
          }
          onSaved(updated);
        },
        onError: (e) =>
          toast({
            title: 'Save failed',
            description: (e as Error).message,
            variant: 'destructive',
          }),
      },
    );
  }

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Edit {plan.tier}</DrawerTitle>
        <DrawerDescription>
          Saving syncs the product + prices to Polar automatically. Features
          on the pricing page derive from limits, so toggling a flag here
          adds or removes the matching bullet.
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <section className="space-y-3">
          <SectionTitle>Basics</SectionTitle>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pmonth">Monthly (USD)</Label>
              <Input
                id="pmonth"
                type="number"
                step="0.01"
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pyear">Yearly (USD)</Label>
              <Input
                id="pyear"
                type="number"
                step="0.01"
                value={priceYearly}
                onChange={(e) => setPriceYearly(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Numeric limits</SectionTitle>
          <p className="font-mono text-[10px] text-fg-subtle">
            -1 means unlimited.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Saved searches" value={limits.savedSearches} onChange={(v) => setLimit('savedSearches', v)} />
            <NumField label="Keywords / search" value={limits.keywordsPerSearch} onChange={(v) => setLimit('keywordsPerSearch', v)} />
            <NumField label="Bulk keyword import" value={limits.bulkKeywordImport} onChange={(v) => setLimit('bulkKeywordImport', v)} />
            <NumField label="Manual runs / mo" value={limits.manualRunsPerMonth} onChange={(v) => setLimit('manualRunsPerMonth', v)} />
            <NumField label="Scheduled runs / search / mo" value={limits.scheduledRunsPerSearchPerMonth} onChange={(v) => setLimit('scheduledRunsPerSearchPerMonth', v)} />
            <NumField label="Email alerts" value={limits.emailAlerts} onChange={(v) => setLimit('emailAlerts', v)} />
            <NumField label="SMS alerts / mo" value={limits.smsAlertsPerMonth} onChange={(v) => setLimit('smsAlertsPerMonth', v)} />
            <NumField label="WhatsApp alerts / mo" value={limits.whatsappAlertsPerMonth} onChange={(v) => setLimit('whatsappAlertsPerMonth', v)} />
            <NumField label="Result history (days)" value={limits.resultHistoryDays} onChange={(v) => setLimit('resultHistoryDays', v)} />
            <NumField label="Team seats" value={limits.teamSeats} onChange={(v) => setLimit('teamSeats', v)} />
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Schedules allowed</SectionTitle>
          <ChipGroup options={CRON_OPTIONS} selected={limits.cron} onToggle={(v) => toggleArr('cron', v)} />
        </section>

        <section className="space-y-3">
          <SectionTitle>Source categories</SectionTitle>
          <ChipGroup options={SOURCE_CATEGORIES} selected={limits.allowedSourceCategories} onToggle={(v) => toggleArr('allowedSourceCategories', v)} />
        </section>

        <section className="space-y-3">
          <SectionTitle>Export formats</SectionTitle>
          <ChipGroup options={EXPORT_FORMATS} selected={limits.exportFormats} onToggle={(v) => toggleArr('exportFormats', v)} />
        </section>

        <section className="space-y-1">
          <SectionTitle>Feature flags</SectionTitle>
          <BoolField label="Smart filtering & duplicate detection" checked={limits.smartFiltering} onChange={(v) => setLimit('smartFiltering', v)} />
          <BoolField label="Keyword generator (AI)" checked={limits.keywordGenerator} onChange={(v) => setLimit('keywordGenerator', v)} />
          <BoolField label="Repeated word identification" checked={limits.repeatedWordIdentification} onChange={(v) => setLimit('repeatedWordIdentification', v)} />
          <BoolField label="Location-based searches" checked={limits.locationSearch} onChange={(v) => setLimit('locationSearch', v)} />
          <BoolField label="Webhooks" checked={limits.webhooks} onChange={(v) => setLimit('webhooks', v)} />
          <BoolField label="API access" checked={limits.apiAccess} onChange={(v) => setLimit('apiAccess', v)} />
          <BoolField label="Custom email domain" checked={limits.customEmailDomain} onChange={(v) => setLimit('customEmailDomain', v)} />
          <BoolField label="Scheduled exports" checked={limits.scheduledExports} onChange={(v) => setLimit('scheduledExports', v)} />
          <BoolField label="Public result sharing" checked={limits.resultSharing} onChange={(v) => setLimit('resultSharing', v)} />
          <BoolField label="Shared searches & alerts" checked={limits.sharedSearches} onChange={(v) => setLimit('sharedSearches', v)} />
          <BoolField label="Role-based permissions (RBAC)" checked={limits.rbac} onChange={(v) => setLimit('rbac', v)} />
          <BoolField label="Community support" checked={limits.communitySupport} onChange={(v) => setLimit('communitySupport', v)} />
          <BoolField label="Email support" checked={limits.emailSupport} onChange={(v) => setLimit('emailSupport', v)} />
          <BoolField label="Priority support" checked={limits.prioritySupport} onChange={(v) => setLimit('prioritySupport', v)} />
          <BoolField label="99.9% uptime SLA" checked={limits.uptimeSLA} onChange={(v) => setLimit('uptimeSLA', v)} />
        </section>

        <section className="space-y-2">
          <SectionTitle>Preview · what users will see</SectionTitle>
          {previewFeatures.length === 0 ? (
            <p className="font-mono text-[10px] text-fg-subtle">
              No features yet — turn on a flag or set a limit above.
            </p>
          ) : (
            <ul className="rounded border border-border bg-bg-elev p-3">
              {previewFeatures.map((f) => (
                <li
                  key={f.key}
                  className="flex items-start gap-2 py-1 text-[12px] text-fg"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fg" />
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DrawerFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={save} loading={busy}>
          Save & sync to Polar
        </Button>
      </DrawerFooter>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
      {children}
    </h3>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </div>
  );
}

function BoolField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-border py-2 last:border-b-0">
      <Label className="cursor-pointer text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: ReadonlyArray<string>;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              'rounded border px-2 py-1 font-mono text-[11px] transition-colors',
              on
                ? 'border-fg bg-bg-elev text-fg'
                : 'border-border bg-bg-sunk text-fg-muted',
            )}
            aria-pressed={on}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------------
// Local mirror of `deriveFeatures()` from apps/api/src/modules/billing
// /plans.catalog.ts. Kept in lockstep so the admin's Preview pane shows
// the same bullets the server will emit. If you change the API
// derivation rules, mirror them here — both files have a comment
// pointing at the other.

type DerivedFeature = { key: string; label: string };

function num(n: number): string {
  return n < 0 ? 'Unlimited' : n.toString();
}

function deriveFeaturesLocal(limits: Limits): DerivedFeature[] {
  const out: DerivedFeature[] = [];
  const push = (key: string, label: string | null) => {
    if (label) out.push({ key, label });
  };

  push(
    'savedSearches',
    limits.savedSearches === 0
      ? null
      : `${num(limits.savedSearches)} saved ${limits.savedSearches === 1 ? 'search' : 'searches'}`,
  );
  push(
    'keywordsPerSearch',
    limits.keywordsPerSearch === 0 ? null : `${num(limits.keywordsPerSearch)} keywords per search`,
  );
  const cronNamed = limits.cron
    .filter((c) => c !== 'MANUAL')
    .map((c) => ({ HOURLY: 'hourly', DAILY: 'daily', WEEKLY: 'weekly', CUSTOM: 'custom' } as Record<string, string>)[c])
    .filter(Boolean);
  push('cron', cronNamed.length === 0 ? null : `${capitalize(cronNamed.join(', '))} scheduling`);
  push(
    'scheduledRunsPerSearchPerMonth',
    limits.scheduledRunsPerSearchPerMonth === 0
      ? null
      : limits.scheduledRunsPerSearchPerMonth < 0
        ? 'Unlimited scheduled runs'
        : `${limits.scheduledRunsPerSearchPerMonth} scheduled runs / search / month`,
  );
  push(
    'manualRunsPerMonth',
    limits.manualRunsPerMonth === 0
      ? null
      : limits.manualRunsPerMonth < 0
        ? 'Unlimited manual runs'
        : `${limits.manualRunsPerMonth} manual runs / month`,
  );
  const alertParts: string[] = [];
  if (limits.emailAlerts !== 0) alertParts.push(`${num(limits.emailAlerts)} email`);
  if (limits.smsAlertsPerMonth > 0) alertParts.push(`${limits.smsAlertsPerMonth} SMS`);
  if (limits.whatsappAlertsPerMonth > 0) alertParts.push(`${limits.whatsappAlertsPerMonth} WhatsApp`);
  push('alerts', alertParts.length === 0 ? null : `${alertParts.join(' + ')} alerts`);
  push(
    'bulkKeywordImport',
    limits.bulkKeywordImport > 0 ? `Bulk keyword input (${limits.bulkKeywordImport} at once)` : null,
  );
  push(
    'allowedSourceCategories',
    limits.allowedSourceCategories.length === 0
      ? null
      : limits.allowedSourceCategories.length >= 4
        ? 'All sources (news, social, forums, blogs)'
        : `Sources: ${limits.allowedSourceCategories.join(', ')}`,
  );
  push(
    'resultHistoryDays',
    limits.resultHistoryDays === 0
      ? null
      : limits.resultHistoryDays < 0
        ? 'Unlimited result history'
        : `${limits.resultHistoryDays}-day result history`,
  );
  push(
    'exportFormats',
    limits.exportFormats.length === 0
      ? null
      : limits.exportFormats.length >= 4
        ? 'All export formats'
        : `${limits.exportFormats.map((f) => f.toUpperCase()).join(' + ')} export`,
  );
  push('teamSeats', limits.teamSeats > 1 ? `Up to ${limits.teamSeats} team members` : null);

  push('locationSearch', limits.locationSearch ? 'Location-based searches' : null);
  push('smartFiltering', limits.smartFiltering ? 'Smart filtering & duplicate detection' : null);
  push('keywordGenerator', limits.keywordGenerator ? 'Keyword generator (AI-suggested)' : null);
  push('repeatedWordIdentification', limits.repeatedWordIdentification ? 'Repeated word identification' : null);
  push('sharedSearches', limits.sharedSearches ? 'Shared searches & alerts' : null);
  push('rbac', limits.rbac ? 'Role-based permissions' : null);
  push('customEmailDomain', limits.customEmailDomain ? 'Custom email domain for alerts' : null);
  push('webhooks', limits.webhooks ? 'Webhooks (Slack, Zapier, custom URLs)' : null);
  push('apiAccess', limits.apiAccess ? 'API access' : null);
  push('scheduledExports', limits.scheduledExports ? 'Scheduled exports' : null);
  push('resultSharing', limits.resultSharing ? 'Public result sharing (/p/<slug>)' : null);
  push(
    'support',
    limits.prioritySupport
      ? 'Priority email support'
      : limits.emailSupport
        ? 'Email support'
        : limits.communitySupport
          ? 'Community support'
          : null,
  );
  push('uptimeSLA', limits.uptimeSLA ? '99.9% uptime SLA' : null);

  return out;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
