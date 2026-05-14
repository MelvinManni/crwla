import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll container for list/table views. Wraps children in an
 * `overflow-auto` div so a tall list scrolls vertically and a wide table
 * scrolls horizontally. Pair with a `min-w-[…]` on the inner content
 * (e.g. `<Table className="min-w-[720px]">`) to prevent columns from
 * crushing at narrow viewports.
 *
 * Pass `maxHeight` to cap vertical height, e.g. `<Overflow maxHeight="60vh">`.
 */
export const Overflow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { maxHeight?: string | number }
>(({ className, style, maxHeight, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full overflow-auto", className)}
    style={maxHeight !== undefined ? { ...style, maxHeight } : style}
    {...props}
  >
    {children}
  </div>
));
Overflow.displayName = "Overflow";
