'use client';

import * as React from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = BaseTooltip.Provider;
const Tooltip = BaseTooltip.Root;
const TooltipTrigger = BaseTooltip.Trigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> & {
  side?: React.ComponentPropsWithoutRef<typeof BaseTooltip.Positioner>['side'];
  align?: React.ComponentPropsWithoutRef<typeof BaseTooltip.Positioner>['align'];
  sideOffset?: number;
};

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof BaseTooltip.Popup>,
  ContentProps
>(({ className, side = 'top', align = 'center', sideOffset = 4, children, ...props }, ref) => (
  <BaseTooltip.Portal>
    <BaseTooltip.Positioner
      side={side}
      align={align}
      sideOffset={sideOffset}
      className="z-[60]"
    >
      <BaseTooltip.Popup
        ref={ref}
        className={cn(
          'overflow-hidden rounded-md bg-black/70 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
      </BaseTooltip.Popup>
    </BaseTooltip.Positioner>
  </BaseTooltip.Portal>
));
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
