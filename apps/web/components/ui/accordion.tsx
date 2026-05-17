'use client';

import * as React from 'react';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// shadcn-shaped accordion. The 4-piece API matches the standard
// shadcn primitive (`Accordion` / `AccordionItem` / `AccordionTrigger`
// / `AccordionContent`); the underlying behaviour is base-ui's
// Accordion to stay consistent with the rest of components/ui/.

const Accordion = BaseAccordion.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof BaseAccordion.Item>,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Item>
>(({ className, ...props }, ref) => (
  <BaseAccordion.Item
    ref={ref}
    className={cn('border-b border-border last:border-b-0', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof BaseAccordion.Trigger>,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Trigger>
>(({ className, children, ...props }, ref) => (
  <BaseAccordion.Header className="flex">
    <BaseAccordion.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center gap-2 py-3 text-left text-sm font-medium transition-colors',
        'hover:bg-bg-sunk/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        '[&[data-panel-open]>svg.chev]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className="chev ml-auto h-3.5 w-3.5 shrink-0 text-fg-muted transition-transform duration-200"
        aria-hidden
      />
    </BaseAccordion.Trigger>
  </BaseAccordion.Header>
));
AccordionTrigger.displayName = 'AccordionTrigger';

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof BaseAccordion.Panel>,
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Panel>
>(({ className, children, ...props }, ref) => (
  <BaseAccordion.Panel
    ref={ref}
    // grid-rows trick for smooth height animation without needing
    // base-ui's CSS-var keyframes plumbed through tailwind.config.
    className={cn(
      'grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out',
      'data-[panel-closed]:grid-rows-[0fr] data-[panel-open]:grid-rows-[1fr]',
      className,
    )}
    {...props}
  >
    <div className="min-h-0 overflow-hidden">{children}</div>
  </BaseAccordion.Panel>
));
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
