'use client';

import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import type { MemberSubscriptionView, UserAdminView } from '@/lib/types';
import { useAdminUserDetail } from '@/lib/queries/admin';
import { ActivityBars, ActivitySparkline } from './activity-chart';

const CATEGORIES = ['news', 'social', 'forums', 'blogs'] as const;

type Props = {
  member: UserAdminView | null;
  onOpenChange: (open: boolean) => void;
  onToggleActive: (u: UserAdminView) => void | Promise<void>;
  onChangeRole: (u: UserAdminView, role: 'admin' | 'member') => void | Promise<void>;
  onToggleCategory: (u: UserAdminView, category: string) => void | Promise<void>;
  busy: boolean;
};

export function MemberDetailDrawer({
  member,
  onOpenChange,
  onToggleActive,
  onChangeRole,
  onToggleCategory,
  busy,
}: Props) {
  const open = member !== null;
  const denied = member?.disabledSourceCategories ?? [];
  const detail = useAdminUserDetail(member?.id ?? null);
  const subscription = detail.data?.subscription ?? null;
  const stats = detail.data?.stats ?? null;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent>
        {member && (
          <>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                {member.name}
                <Badge variant={member.role === 'Admin' ? 'default' : 'secondary'}>
                  {member.role}
                </Badge>
                {!member.active && <Badge variant="destructive">Inactive</Badge>}
              </DrawerTitle>
              <DrawerDescription>Member · last active {member.last}</DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <dl className="space-y-4 text-sm">
                <Field label="Email" value={member.email} />
                <Field label="Team" value={member.team || '—'} />
                <Field label="Last active" value={member.last} />
                {detail.data?.user && (
                  <>
                    <Field label="Joined" value={fmtDate(detail.data.user.createdAt)} />
                    <Field
                      label="Searches / alerts"
                      value={`${detail.data.user.searchCount} · ${detail.data.user.alertCount}`}
                    />
                  </>
                )}
              </dl>

              <section>
                <SectionHeading>Subscription</SectionHeading>
                {detail.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : subscription ? (
                  <SubscriptionBlock sub={subscription} />
                ) : (
                  <p className="text-xs text-muted-foreground">No subscription on file.</p>
                )}
              </section>

              <section>
                <SectionHeading>
                  Activity
                  {stats && (
                    <span className="font-mono text-[10px] tracking-normal text-fg-subtle">
                      {' · '}
                      {stats.total} total · last {stats.windowDays}d
                    </span>
                  )}
                </SectionHeading>
                {detail.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : stats ? (
                  <div className="space-y-4">
                    <div className="text-fg">
                      <ActivitySparkline data={stats.daily} />
                    </div>
                    <div>
                      <h5 className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                        By type ({stats.windowDays}d)
                      </h5>
                      <ActivityBars data={stats.byType.slice(0, 8)} />
                    </div>
                    <div>
                      <h5 className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                        Recent
                      </h5>
                      {stats.recent.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No events.</p>
                      ) : (
                        <ul className="space-y-1 text-xs">
                          {stats.recent.slice(0, 10).map((r) => (
                            <li
                              key={r.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate">{r.label}</span>
                              <span className="font-mono text-[10px] text-fg-subtle">
                                {fmtRel(r.at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                )}
              </section>

              <section>
                <SectionHeading>Source access</SectionHeading>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const off = denied.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => onToggleCategory(member, cat)}
                        disabled={busy}
                        className={cn(
                          'rounded border px-2 py-1 font-mono text-[11px] transition-colors',
                          off
                            ? 'border-border bg-bg-sunk text-fg-muted line-through'
                            : 'border-fg bg-bg-elev text-fg',
                        )}
                        aria-pressed={!off}
                        title={off ? `Enable ${cat}` : `Disable ${cat}`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="ghost" disabled={busy}>
                  Close
                </Button>
              </DrawerClose>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => onChangeRole(member, member.role === 'Admin' ? 'member' : 'admin')}
              >
                {member.role === 'Admin' ? 'Demote' : 'Promote'}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => onToggleActive(member)}
              >
                {member.active ? 'Deactivate' : 'Activate'}
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function SubscriptionBlock({ sub }: { sub: MemberSubscriptionView }) {
  const price =
    sub.interval === 'YEAR' ? sub.priceYearlyCents : sub.priceMonthlyCents;
  const priceLabel =
    price > 0
      ? `$${(price / 100).toFixed(0)} / ${sub.interval === 'YEAR' ? 'yr' : 'mo'}`
      : 'free';
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
          Plan
        </dt>
        <dd className="flex items-center gap-2">
          <span className="font-medium">{sub.planName}</span>
          <Badge variant="secondary">{sub.planTier}</Badge>
          <span className="font-mono text-[11px] text-fg-muted">{priceLabel}</span>
        </dd>
      </div>
      <div className="flex items-center justify-between gap-2">
        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
          Status
        </dt>
        <dd className="flex items-center gap-2">
          <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
          {sub.cancelAtPeriodEnd && (
            <span className="font-mono text-[10px] text-fg-subtle">
              cancels at period end
            </span>
          )}
        </dd>
      </div>
      {sub.seats > 1 && <Field label="Seats" value={String(sub.seats)} />}
      <Field label="Started" value={fmtDate(sub.currentPeriodStart ?? sub.createdAt)} />
      <Field
        label={sub.cancelAtPeriodEnd ? 'Ends' : 'Renews'}
        value={fmtDate(sub.currentPeriodEnd)}
      />
      {sub.canceledAt && <Field label="Canceled" value={fmtDate(sub.canceledAt)} />}
    </dl>
  );
}

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACTIVE':
    case 'TRIALING':
      return 'default';
    case 'PAST_DUE':
    case 'UNPAID':
    case 'CANCELED':
    case 'INCOMPLETE':
    case 'INCOMPLETE_EXPIRED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
      {children}
    </h4>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtRel(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}
