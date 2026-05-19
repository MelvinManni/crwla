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
    <BasePopover.Positioner side={side} sideOffset={sideOffset} align={align}>
      <BasePopover.Popup
        ref={ref}
        className={cn(
          'z-50 rounded-md border border-border bg-bg-elev p-1 shadow-lg outline-none',
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
