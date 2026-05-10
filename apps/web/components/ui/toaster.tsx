'use client';

import * as React from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  useToastManager,
} from '@/components/ui/toast';

/**
 * Wraps children in Base UI's Toast.Provider. Every page/component beneath
 * this can call `useToast()` (which under the hood calls
 * `Toast.useToastManager()`).
 *
 * Mount once near the top of an authenticated layout. The viewport + the
 * actual toast renderer are co-located here so the call site is one tag.
 */
export function ToasterProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastList />
      <ToastViewport />
    </ToastProvider>
  );
}

function ToastList() {
  const { toasts } = useToastManager();
  return (
    <>
      {toasts.map((toast) => {
        const variant = (toast.data as { variant?: 'default' | 'destructive' } | undefined)?.variant;
        return (
          <Toast key={toast.id} toast={toast} variant={variant}>
            <div className="grid gap-1">
              {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
              {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
            </div>
            <ToastClose />
          </Toast>
        );
      })}
    </>
  );
}
