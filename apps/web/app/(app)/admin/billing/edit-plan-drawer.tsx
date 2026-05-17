'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
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

// Field-level shape for plan limits. The raw JSON in the DB is the union
// of these, but the editor needs a fully-typed object so each control can
// bind to a discrete piece of state.
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
  webhooks: boolean;
  apiAccess: boolean;
  customEmailDomain: boolean;
  scheduledExports: boolean;
  resultSharing: boolean;
  teamSeats: number;
  prioritySupport: boolean;
  uptimeSLA: boolean;
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
          <EditPlanForm
            plan={plan}
            onClose={onClose}
            onSaved={onSaved}
          />
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
  const [features, setFeatures] = useState(plan.features.join('\n'));
  const [limits, setLimits] = useState<Limits>(readLimits(plan.limits));
  const busy = saveMut.isPending;

  function setLimit<K extends keyof Limits>(key: K, value: Limits[K]) {
    setLimits((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArr(key: 'cron' | 'allowedSourceCategories' | 'exportFormats', value: string) {
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
        features: features.split('\n').map((f) => f.trim()).filter(Boolean),
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
          Saving syncs the product + prices to Polar automatically. Existing
          subscribers keep their plan.
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
          <div className="space-y-1.5">
            <Label htmlFor="features">Features (one per line)</Label>
            <Textarea
              id="features"
              rows={6}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="font-mono text-[12px]"
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Numeric limits</SectionTitle>
          <p className="font-mono text-[10px] text-fg-subtle">
            -1 means unlimited.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="Saved searches"
              value={limits.savedSearches}
              onChange={(v) => setLimit('savedSearches', v)}
            />
            <NumField
              label="Keywords / search"
              value={limits.keywordsPerSearch}
              onChange={(v) => setLimit('keywordsPerSearch', v)}
            />
            <NumField
              label="Bulk keyword import"
              value={limits.bulkKeywordImport}
              onChange={(v) => setLimit('bulkKeywordImport', v)}
            />
            <NumField
              label="Manual runs / mo"
              value={limits.manualRunsPerMonth}
              onChange={(v) => setLimit('manualRunsPerMonth', v)}
            />
            <NumField
              label="Scheduled runs / search / mo"
              value={limits.scheduledRunsPerSearchPerMonth}
              onChange={(v) =>
                setLimit('scheduledRunsPerSearchPerMonth', v)
              }
            />
            <NumField
              label="Email alerts"
              value={limits.emailAlerts}
              onChange={(v) => setLimit('emailAlerts', v)}
            />
            <NumField
              label="SMS alerts / mo"
              value={limits.smsAlertsPerMonth}
              onChange={(v) => setLimit('smsAlertsPerMonth', v)}
            />
            <NumField
              label="WhatsApp alerts / mo"
              value={limits.whatsappAlertsPerMonth}
              onChange={(v) => setLimit('whatsappAlertsPerMonth', v)}
            />
            <NumField
              label="Result history (days)"
              value={limits.resultHistoryDays}
              onChange={(v) => setLimit('resultHistoryDays', v)}
            />
            <NumField
              label="Team seats"
              value={limits.teamSeats}
              onChange={(v) => setLimit('teamSeats', v)}
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Schedules allowed</SectionTitle>
          <ChipGroup
            options={CRON_OPTIONS}
            selected={limits.cron}
            onToggle={(v) => toggleArr('cron', v)}
          />
        </section>

        <section className="space-y-3">
          <SectionTitle>Source categories</SectionTitle>
          <ChipGroup
            options={SOURCE_CATEGORIES}
            selected={limits.allowedSourceCategories}
            onToggle={(v) => toggleArr('allowedSourceCategories', v)}
          />
        </section>

        <section className="space-y-3">
          <SectionTitle>Export formats</SectionTitle>
          <ChipGroup
            options={EXPORT_FORMATS}
            selected={limits.exportFormats}
            onToggle={(v) => toggleArr('exportFormats', v)}
          />
        </section>

        <section className="space-y-1">
          <SectionTitle>Feature flags</SectionTitle>
          <BoolField
            label="Webhooks"
            checked={limits.webhooks}
            onChange={(v) => setLimit('webhooks', v)}
          />
          <BoolField
            label="API access"
            checked={limits.apiAccess}
            onChange={(v) => setLimit('apiAccess', v)}
          />
          <BoolField
            label="Custom email domain"
            checked={limits.customEmailDomain}
            onChange={(v) => setLimit('customEmailDomain', v)}
          />
          <BoolField
            label="Scheduled exports"
            checked={limits.scheduledExports}
            onChange={(v) => setLimit('scheduledExports', v)}
          />
          <BoolField
            label="Public result sharing"
            checked={limits.resultSharing}
            onChange={(v) => setLimit('resultSharing', v)}
          />
          <BoolField
            label="Priority support"
            checked={limits.prioritySupport}
            onChange={(v) => setLimit('prioritySupport', v)}
          />
          <BoolField
            label="Uptime SLA"
            checked={limits.uptimeSLA}
            onChange={(v) => setLimit('uptimeSLA', v)}
          />
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
