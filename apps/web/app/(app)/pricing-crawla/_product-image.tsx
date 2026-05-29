"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders a product image fetched from an arbitrary retailer host.
 * Falls back to a neutral placeholder icon when:
 *   - `src` is null (extractor didn't find an `og:image` / JSON-LD image)
 *   - the image 404s, times out, or hotlink-blocks at request time
 *
 * Uses plain <img> on purpose: pricing results come from any retailer
 * the crawler discovers, so a Next/Image domain whitelist isn't
 * workable. `loading="lazy"` keeps offscreen cards from hammering the
 * browser on long result pages.
 */
export function ProductImage({
  src,
  alt,
  className,
  iconClassName,
  fit = "contain",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  iconClassName?: string;
  fit?: "contain" | "cover";
}) {
  const [errored, setErrored] = useState(false);
  const showFallback = !src || errored;

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-bg-sunk text-fg-muted",
        className,
      )}
    >
      {showFallback ? (
        <ImageIcon className={cn("h-6 w-6", iconClassName)} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          referrerPolicy="no-referrer"
          className={cn(
            "h-full w-full",
            fit === "cover" ? "object-cover" : "object-contain",
          )}
        />
      )}
    </div>
  );
}
