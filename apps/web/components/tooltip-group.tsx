import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  message: React.ReactNode;
  children: React.ReactElement;
  side?: React.ComponentProps<typeof TooltipContent>["side"];
  align?: React.ComponentProps<typeof TooltipContent>["align"];
  hidden?: boolean;
  contentClassName?: string;
};

export default function TooltipGroup({
  children,
  message,
  side,
  align,
  hidden,
  contentClassName,
}: Props) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={children} />
        <TooltipContent
          side={side}
          align={align}
          hidden={hidden}
          className={cn("max-w-[320px]", contentClassName)}
        >
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
