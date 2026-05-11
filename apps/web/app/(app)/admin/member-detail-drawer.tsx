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
import type { UserAdminView } from '@/lib/types';

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
              </dl>

              <div>
                <h4 className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                  Source access
                </h4>
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
              </div>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
