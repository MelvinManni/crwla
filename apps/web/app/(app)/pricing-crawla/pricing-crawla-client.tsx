"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Globe,
  Play,
  Search,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useFeature } from "@/lib/queries/features";
import {
  useCreatePricingSearch,
  useDeletePricingSearch,
  usePricingMeta,
  usePricingSearches,
  type CreatePricingSearchInput,
  type PricingMetaResponse,
  type PricingSearchView,
} from "@/lib/queries/pricing-crawla";

export function PricingCrawlaClient() {
  // Source of truth lives on the server (FeatureAccessService).
  const { allowed, check, loading } = useFeature("pricing_crawla");
  const meta = usePricingMeta();
  const recent = usePricingSearches();

  if (loading) return null;
  if (!allowed) return <UpgradeCard check={check} />;

  return (
    <div className="space-y-6">
      <SearchScreen meta={meta.data ?? null} />
      <RecentSearches items={recent.data?.items ?? []} loading={recent.isLoading} />
    </div>
  );
}

function UpgradeCard({ check }: { check: ReturnType<typeof useFeature>["check"] }) {
  return (
    <Card className="mx-auto max-w-2xl border-dashed bg-card p-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted">
        <Sparkles className="h-5 w-5" />
      </div>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        {check?.label ?? "Pricing Crawla"} requires{" "}
        {check?.requiresLabel ?? "Starter or higher"}
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Compare product prices across 40+ stores, get YouTube unboxings,
        store-specific reviews, and 3 cheaper alternatives — in one view.
      </p>
      {check?.reason && (
        <p className="mt-3 font-mono text-[11px] text-fg-subtle">{check.reason}</p>
      )}
      <div className="mt-6 flex justify-center gap-2">
        <Button render={<Link href="/billing" />}>View plans</Button>
        <Button variant="ghost" render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
      </div>
    </Card>
  );
}

function SearchScreen({ meta }: { meta: PricingMetaResponse | null }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const defaultCountry = meta?.countries[0]?.code ?? "NG";
  const defaultCategory = meta?.categories[0] ?? "Phones";
  const [country, setCountry] = useState(defaultCountry);
  const [category, setCategory] = useState(defaultCategory);
  const [maxPrice, setMaxPrice] = useState("");
  const create = useCreatePricingSearch();
  const trending = meta?.trending ?? [];

  function submit(productName?: string) {
    const name = (productName ?? q).trim();
    if (!name) return;
    const input: CreatePricingSearchInput = {
      productName: name,
      country,
      category,
      ...(maxPrice ? { maxPriceUsd: Number(maxPrice) } : {}),
    };
    create.mutate(input, {
      onSuccess: (res) => router.push(`/pricing-crawla/${res.search.id}`),
    });
  }

  return (
    <>
      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          — Pricing
        </div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
          Find the <em className="italic text-primary">best price</em> across every
          store.
        </h1>
        <p className="max-w-2xl text-[14px] text-fg-muted">
          Paste a product name. We crawl 40+ retailers, compare with shipping
          included, and show you reviews and video unboxings in one view.
        </p>
      </div>

      <div className="flex items-stretch gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
        <div className="flex items-center pl-2 text-fg-muted">
          <Search className="h-4 w-4" />
        </div>
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. iPhone 15 Pro Max 256GB, AirPods Pro 2, PlayStation 5 Slim…"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-9 flex-1 border-0 bg-transparent text-[14px] shadow-none focus-visible:ring-0"
        />
        <span className="grid h-9 w-9 place-items-center rounded-md border border-border bg-bg-sunk font-mono text-[11px] text-fg-subtle">
          ⏎
        </span>
        <Button loading={create.isPending} onClick={() => submit()}>
          Compare prices <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <FilterRow
        meta={meta}
        country={country}
        category={category}
        maxPrice={maxPrice}
        onCountry={setCountry}
        onCategory={setCategory}
        onMaxPrice={setMaxPrice}
      />

      {trending.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            Trending
          </span>
          {trending.map((t) => (
            <button
              key={t.q}
              onClick={() => {
                setQ(t.q);
                submit(t.q);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12px] text-fg hover:bg-bg-sunk"
            >
              {t.hot && <TrendingUp className="h-3 w-3 text-primary" />}
              {t.q}
            </button>
          ))}
        </div>
      )}

      <StatsRow meta={meta} />
    </>
  );
}

function StatsRow({ meta }: { meta: PricingMetaResponse | null }) {
  const items = [
    {
      ico: <Globe className="h-4 w-4" />,
      k: meta ? `${meta.stats.retailers}+` : "—",
      l: "retailers crawled",
    },
    {
      ico: <TrendingUp className="h-4 w-4" />,
      k: meta ? `${meta.stats.resultsTracked.toLocaleString()}` : "—",
      l: "listings tracked",
    },
    {
      ico: <Star className="h-4 w-4 text-primary" />,
      k: meta ? abbreviate(meta.stats.reviewsIndexed) : "—",
      l: "reviews indexed",
    },
    {
      ico: <Play className="h-4 w-4 text-primary" />,
      k: "1 click",
      l: "video unboxings",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((s, i) => (
        <Card key={i} className="flex flex-col gap-2 p-4 shadow-none">
          <span className="text-fg-muted">{s.ico}</span>
          <div className="text-[22px] font-semibold tracking-[-0.02em]">{s.k}</div>
          <div className="font-mono text-[11px] uppercase tracking-[0.04em] text-fg-subtle">
            {s.l}
          </div>
        </Card>
      ))}
    </div>
  );
}

function FilterRow({
  meta,
  country,
  category,
  maxPrice,
  onCountry,
  onCategory,
  onMaxPrice,
}: {
  meta: PricingMetaResponse | null;
  country: string;
  category: string;
  maxPrice: string;
  onCountry: (s: string) => void;
  onCategory: (s: string) => void;
  onMaxPrice: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const countries = meta?.countries ?? [];
  const categories = meta?.categories ?? [];
  const active = countries.find((c) => c.code === country);
  const flag = active?.flag ?? "🌍";
  const cName = active?.name ?? "All";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] hover:bg-bg-sunk",
          open && "border-fg",
        )}
      >
        <Sliders className="h-3.5 w-3.5" />
        <span>Filters</span>
      </button>
      <Chip label="Ship to" value={`${flag} ${cName}`} />
      <Chip label="Category" value={category} />
      <Chip label="Max price" value={maxPrice ? `$${maxPrice}` : "Any"} />

      {open && (
        <div className="mt-2 grid w-full grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
          <Field label="Country">
            <select
              value={country}
              onChange={(e) => onCountry(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => onCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]"
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Max price (USD)">
            <Input
              type="number"
              value={maxPrice}
              onChange={(e) => onMaxPrice(e.target.value)}
              placeholder="Any"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </span>
      <span className="text-fg">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

function RecentSearches({
  items,
  loading,
}: {
  items: PricingSearchView[];
  loading: boolean;
}) {
  const del = useDeletePricingSearch();
  const [pending, setPending] = useState<PricingSearchView | null>(null);
  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className="space-y-3 border-t border-border pt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
          Your recent searches
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
          {items.length} saved
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <div key={s.id} className="group relative">
            <Link
              href={`/pricing-crawla/${s.id}`}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 pr-10 text-left transition hover:border-fg/30 hover:shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                  {relativeTime(s.createdAt)}
                </span>
                <StatusPill status={s.status} />
              </div>
              <div className="line-clamp-2 text-[14px] font-medium leading-snug">
                {s.productName}
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-fg-muted">
                {s.country && <span>{s.country}</span>}
                {s.category && (
                  <>
                    <span className="text-fg-subtle">·</span>
                    <span>{s.category}</span>
                  </>
                )}
                {typeof s.resultCount === "number" && (
                  <>
                    <span className="text-fg-subtle">·</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                      {s.resultCount} {s.resultCount === 1 ? "result" : "results"}
                    </span>
                  </>
                )}
              </div>
            </Link>
            <button
              type="button"
              aria-label="Delete search"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPending(s);
              }}
              disabled={del.isPending}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md border border-transparent text-fg-subtle opacity-0 transition group-hover:opacity-100 hover:border-border hover:bg-bg-sunk hover:text-destructive focus-visible:opacity-100 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title="Delete pricing search?"
        description={
          pending
            ? `This will permanently delete the search for "${pending.productName}" and all its results. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete search"
        destructive
        onConfirm={() => {
          if (pending) del.mutate(pending.id);
          setPending(null);
        }}
      />
    </section>
  );
}

function StatusPill({ status }: { status: PricingSearchView["status"] }) {
  const tone =
    status === "COMPLETED"
      ? "bg-leaf/10 text-leaf border-leaf/30"
      : status === "ERROR"
        ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-900/50"
        : "bg-bg-sunk text-fg-muted border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]",
        tone,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "COMPLETED" && "bg-leaf",
          status === "ERROR" && "bg-orange-500",
          status !== "COMPLETED" && status !== "ERROR" && "bg-fg-subtle animate-pulse",
        )}
      />
      {status.toLowerCase()}
    </span>
  );
}

function abbreviate(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
