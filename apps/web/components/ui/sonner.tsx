'use client';

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

// shadcn-style sonner wrapper. The codebase doesn't ship next-themes, so
// `theme="system"` is enough — sonner reads `prefers-color-scheme` and
// also respects the `dark` class on <html> via its CSS-variable surface.
function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme="system"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
export { toast } from 'sonner';
