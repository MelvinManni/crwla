"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, RefreshCw, Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProductImage } from "../_product-image";
import {
  useDeletePricingSearch,
  useFxRates,
  usePricingMeta,
  usePricingResults,
  type PricingResultView,
} from "@/lib/queries/pricing-crawla";

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  NGN: "₦",
  EUR: "€",
  GBP: "£",
  GHS: "₵",
};

const SUPPORTED = ["USD", "NGN", "EUR", "GBP"] as const;

export function PricingResultsClient({ searchId }: { searchId: string }) {
  const router = useRouter();
  const [ccy, setCcy] = useState<(typeof SUPPORTED)[number]>("USD");
  const [sort, setSort] = useState<
    "price-asc" | "price-desc" | "rating" | "reviews"
  >("price-asc");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data, isLoading, refetch, isRefetching } = usePricingResults(searchId);
  const { data: rates } = useFxRates();
  const { data: meta } = usePricingMeta();
  const del = useDeletePricingSearch();
  const results = data?.results ?? [];
  const search = data?.search;
  const sym = CURRENCY_SYMBOL[ccy] ?? "$";

  const sorted = useMemo(() => {
    const copy = [...results];
    switch (sort) {
      case "price-asc":
        return copy.sort((a, b) => a.priceUsd - b.priceUsd);
      case "price-desc":
        return copy.sort((a, b) => b.priceUsd - a.priceUsd);
      case "rating":
        return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case "reviews":
        return copy.sort((a, b) => b.reviewCount - a.reviewCount);
    }
  }, [results, sort]);

  function fmt(usd: number) {
    const rate = rates?.rates[ccy] ?? 1;
    const val = usd * rate;
    if (ccy === "NGN") return Math.round(val).toLocaleString();
    return val.toFixed(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/pricing-crawla" />}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All searches
        </Button>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          — Results
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          loading={del.isPending}
          disabled={!search}
          className="ml-auto text-fg-subtle hover:text-destructive"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete pricing search?"
        description={
          search
            ? `This will permanently delete the search for "${search.productName}" and all its results. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete search"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          del.mutate(searchId, {
            onSuccess: () => router.push("/pricing-crawla"),
          });
        }}
      />

      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">
          Prices for <em className="italic">&ldquo;{search?.productName ?? "…"}&rdquo;</em>
        </h1>
        <p className="text-[13px] text-fg-muted">
          {search?.status === "RUNNING" || search?.status === "PENDING"
            ? "Crawling stores in parallel — results stream in within a few seconds."
            : `Compared across ${results.length} ${
                results.length === 1 ? "store" : "stores"
              }${
                search?.country
                  ? ` in ${
                      meta?.countries.find((c) => c.code === search.country)?.name ??
                      search.country
                    }`
                  : ""
              }. Refresh anytime.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="font-mono text-[11px] text-fg-subtle">
          <em className="not-italic text-fg">{results.length}</em> results
        </span>
        {search && (
          <div className="flex flex-wrap items-center gap-1">
            {search.country &&
              (() => {
                const c = meta?.countries.find((x) => x.code === search.country);
                return c ? (
                  <AppliedChip>
                    {c.flag} {c.name}
                  </AppliedChip>
                ) : null;
              })()}
            {search.category && <AppliedChip>{search.category}</AppliedChip>}
            {search.maxPriceUsd ? (
              <AppliedChip>≤ ${search.maxPriceUsd}</AppliedChip>
            ) : null}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-border bg-bg-sunk">
            {SUPPORTED.map((c) => (
              <button
                key={c}
                onClick={() => setCcy(c)}
                className={cn(
                  "px-2.5 py-1 font-mono text-[11px]",
                  ccy === c ? "bg-card text-fg" : "text-fg-subtle hover:text-fg",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
          >
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="rating">Rating</option>
            <option value="reviews">Most reviewed</option>
          </select>
          <Button
            variant="outline"
            size="icon-sm"
            title="Refresh"
            loading={isRefetching}
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ||
      search?.status === "RUNNING" ||
      search?.status === "PENDING" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-3">
              <Skeleton className="mb-3 h-32 w-full" />
              <Skeleton className="mb-2 h-4 w-4/5" />
              <Skeleton className="h-4 w-2/5" />
            </Card>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-10 text-center text-fg-muted">
          <Search className="h-5 w-5" />
          <p className="text-[13px]">No matching results yet — try a different query.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              sym={sym}
              priceLabel={fmt(p.priceUsd)}
            />
          ))}
        </div>
      )}

      {search?.alternatives && search.alternatives.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            3 cheaper alternatives
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {search.alternatives.slice(0, 3).map((a, i) => (
              <Card key={i} className="flex gap-3 p-3">
                <ProductImage
                  src={a.imageUrl}
                  alt={a.title}
                  fit="contain"
                  className="h-14 w-14 shrink-0 rounded-md"
                  iconClassName="h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-[13px] font-medium">{a.title}</div>
                  <div className="font-mono text-[12px] text-fg-muted">
                    {sym}
                    {fmt(a.priceUsd)}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-leaf">
                    {a.save}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  sym,
  priceLabel,
}: {
  product: PricingResultView;
  sym: string;
  priceLabel: string;
}) {
  const tier =
    product.percentile < 0.2
      ? "best"
      : product.percentile < 0.5
        ? "mid"
        : "high";
  return (
    <Link
      href={`/pricing-crawla/result/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-fg/30 hover:shadow"
    >
      <div className="relative h-32 w-full">
        <ProductImage
          src={product.imageUrl}
          alt={product.title}
          fit="contain"
          className="h-full w-full"
        />
        {product.dealBadge && (
          <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-primary-foreground">
            {product.dealBadge}
          </span>
        )}
        {product.youtubeUrl && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-foreground px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-background">
            <Play className="h-2.5 w-2.5" /> video
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
          <span className="grid h-4 w-4 place-items-center rounded bg-bg-sunk text-fg">
            {product.storeName[0]}
          </span>
          <span>{product.storeName}</span>
        </div>
        <div className="line-clamp-2 text-[13px] font-medium leading-snug">
          {product.title}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[11px] text-fg-muted">{sym}</span>
            <span className="text-[18px] font-semibold tracking-[-0.01em]">
              {priceLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-fg-subtle">
            <Star className="h-3 w-3 text-primary" />
            {(product.rating ?? 0).toFixed(1)}
            <span className="text-fg-subtle">
              · {product.reviewCount.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg-sunk">
          <div
            className={cn(
              "h-full rounded-full",
              tier === "best" && "bg-leaf",
              tier === "mid" && "bg-amber-500",
              tier === "high" && "bg-orange-500",
            )}
            style={{ width: `${Math.max(8, product.percentile * 100)}%` }}
          />
        </div>
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
          <span>
            {tier === "best" ? "Best price" : tier === "mid" ? "Avg" : "Above avg"}
          </span>
          <span>{Math.round(product.percentile * 100)}th %ile</span>
        </div>
      </div>
    </Link>
  );
}

function AppliedChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-sunk px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted">
      {children}
    </span>
  );
}
