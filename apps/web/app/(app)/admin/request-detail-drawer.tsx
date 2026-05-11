'use client';

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
import type { AccessRequestView } from '@/lib/types';

type Props = {
  request: AccessRequestView | null;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void | Promise<void>;
  onDeny: (id: string) => void | Promise<void>;
  busy: boolean;
};

export function RequestDetailDrawer({ request, onOpenChange, onApprove, onDeny, busy }: Props) {
  const open = request !== null;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent>
        {request && (
          <>
            <DrawerHeader>
              <DrawerTitle>{request.name}</DrawerTitle>
              <DrawerDescription>Access request · {request.requested}</DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto p-4">
              <dl className="space-y-4 text-sm">
                <Field label="Email" value={request.email} />
                <Field label="Team" value={request.team || '—'} />
                <Field label="Requested" value={request.requested} />
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                    Reason
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm">
                    {request.reason || <span className="text-muted-foreground">No reason given.</span>}
                  </dd>
                </div>
              </dl>
            </div>

            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="ghost" disabled={busy}>
                  Cancel
                </Button>
              </DrawerClose>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => onDeny(request.id)}
              >
                Deny
              </Button>
              <Button loading={busy} onClick={() => onApprove(request.id)}>
                Approve
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
