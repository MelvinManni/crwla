'use client';

// Thin adapter over Base UI's Toast manager. Keeps the existing call-site
// API:  const { toast } = useToast(); toast({ title, description, variant })
//
// Variant is passed through Base UI's `data` slot and consumed by the
// renderer in components/ui/toaster.tsx — Base UI doesn't model variant
// natively, so we ride along as arbitrary metadata.

import { useToastManager } from '@/components/ui/toast';

type ToastVariant = 'default' | 'destructive';

type ToastInput = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
};

export function useToast() {
  const manager = useToastManager();

  function toast({ title, description, variant = 'default', duration }: ToastInput) {
    return manager.add({
      title,
      description,
      timeout: duration,
      data: { variant },
    });
  }

  function dismiss(id?: string) {
    if (id) manager.close(id);
    else manager.toasts.forEach((t) => manager.close(t.id));
  }

  return { toast, dismiss, toasts: manager.toasts };
}
