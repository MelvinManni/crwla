'use client';

import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';

// shadcn-shaped Popover. Same 3-piece API
// (`Popover` / `PopoverTrigger` / `PopoverContent`) as the canonical
// shadcn primitive; backed by base-ui to stay consistent with the rest
// of components/ui/.

const Popover = BasePopover.Root;
const PopoverTrigger = BasePopover.Trigger;
const PopoverPortal = BasePopover.Portal;

type PopoverContentProps = React.ComponentPropsWithoutRef<
  typeof BasePopover.Popup
> & {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
};

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof BasePopover.Popup>,
  PopoverContentProps
>(({ className, align = 'center', side = 'bottom', sideOffset = 6, ...props }, ref) => (
  <PopoverPortal>
    {/* z-50 lives on the Positioner because that's the element that
        actually sits in <body>'s stacking context. Putting it on the
        Popup alone fails when the page has a sticky/positioned ancestor
        with an explicit z-index (e.g. the results-pane filter bar at
        z-20) — the Positioner without its own z-index lands below it. */}
    <BasePopover.Positioner
      side={side}
      sideOffset={sideOffset}
      align={align}
      className="z-50"
    >
      <BasePopover.Popup
        ref={ref}
        className={cn(
          'rounded-md border border-border bg-bg-elev p-1 shadow-lg outline-none',
          'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-150',
          className,
        )}
        {...props}
      />
    </BasePopover.Positioner>
  </PopoverPortal>
));
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };
