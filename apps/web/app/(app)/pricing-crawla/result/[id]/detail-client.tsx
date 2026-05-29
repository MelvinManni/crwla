"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  Play,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFxRates, usePricingDetail } from "@/lib/queries/pricing-crawla";
import { ProductImage } from "../../_product-image";

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  NGN: "₦",
  EUR: "€",
  GBP: "£",
  GHS: "₵",
};

const SUPPORTED = ["USD", "NGN", "EUR", "GBP"] as const;

export function PricingDetailClient({ resultId }: { resultId: string }) {
  const [ccy, setCcy] = useState<(typeof SUPPORTED)[number]>("USD");
  const { data, isLoading } = usePricingDetail(resultId);
  const { data: rates } = useFxRates();
  const sym = CURRENCY_SYMBOL[ccy] ?? "$";

  function fmt(usd: number) {
    const rate = rates?.rates[ccy] ?? 1;
    const val = usd * rate;
    if (ccy === "NGN") return Math.round(val).toLocaleString();
    return val.toFixed(0);
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const r = data.result;
  const reviews = data.reviews;
  const backHref = `/pricing-crawla/${data.search.id}` as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href={backHref} />}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to results
        </Button>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          — Detail
        </span>
      </div>

      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{r.title}</h1>
        <p className="text-[12px] text-fg-muted">
          From {r.storeName} · trust {(r.trustScore * 100).toFixed(0)}/100
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden p-0">
          <ProductImage
            src={r.imageUrl}
            alt={r.title}
            fit="contain"
            className="h-48 w-full"
            iconClassName="h-8 w-8"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[12px] text-fg-muted">{sym}</span>
                <span className="text-[28px] font-semibold tracking-[-0.02em]">
                  {fmt(r.priceUsd)}
                </span>
              </div>
              {r.intentReason && (
                <div className="mt-1 font-mono text-[11px] text-leaf">
                  {r.intentReason}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Heart className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button render={<a href={r.url} target="_blank" rel="noreferrer" />}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Buy on {r.storeName}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          {r.youtubeUrl ? (
            <a
              href={r.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <div className="relative grid h-32 w-full place-items-center rounded-md bg-bg-sunk">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-card shadow group-hover:scale-105">
                  <Play className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                YouTube — official channel
              </div>
              <div className="text-[13px] font-medium">Watch the unboxing</div>
            </a>
          ) : (
            <div className="text-[12px] text-fg-muted">No verified video yet.</div>
          )}

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <div className="flex overflow-hidden rounded-md border border-border bg-bg-sunk">
              {SUPPORTED.map((c) => (
                <button
                  key={c}
                  onClick={() => setCcy(c)}
                  className={cn(
                    "px-2 py-1 font-mono text-[10px]",
                    ccy === c ? "bg-card text-fg" : "text-fg-subtle hover:text-fg",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <span className="font-mono text-[11px] text-fg-subtle">
              {r.currencyNative && r.priceNative
                ? `Originally ${r.currencyNative} ${Math.round(r.priceNative).toLocaleString()}`
                : "USD-native listing"}
            </span>
          </div>
        </Card>
      </div>

      <Card className="space-y-3 p-5">
        <h3 className="text-[14px] font-semibold">
          Reviews from this store ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <p className="text-[12px] text-fg-muted">
            No reviews captured for this listing yet.
          </p>
        ) : (
          reviews.map((rv) => (
            <div
              key={rv.id}
              className="border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-bg-sunk font-mono text-[10px] uppercase">
                  {rv.author
                    .split(/\s+/)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="text-[12px] font-medium">{rv.author}</span>
                <span className="ml-auto font-mono text-[10px] text-fg-subtle">
                  {rv.rating.toFixed(1)}★
                </span>
              </div>
              <p className="text-[12px] text-fg-muted">{rv.body}</p>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
