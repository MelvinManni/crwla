"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  Globe,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useFeature } from "@/lib/queries/features";
import {
  useCreateJobSearch,
  useDeleteJobSearch,
  useJobSearches,
  useJobsMeta,
  type JobSearchView,
  type JobsMetaResponse,
} from "@/lib/queries/job-search";

export function JobsClient() {
  const { allowed, check, loading } = useFeature("job_search");
  const meta = useJobsMeta();
  const recent = useJobSearches();

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
        {check?.label ?? "Job Search"} requires{" "}
        {check?.requiresLabel ?? "Starter or higher"}
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        We crawl 200+ company career pages directly — every 15 minutes. Skip
        LinkedIn noise. Apply when the listing is fresh.
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

function SearchScreen({ meta }: { meta: JobsMetaResponse | null }) {
  const router = useRouter();
  const [role, setRole] = useState("");
  const defaultCountry = meta?.countries[0]?.code ?? "US";
  const [country, setCountry] = useState(defaultCountry);
  const [remote, setRemote] = useState(true);
  const create = useCreateJobSearch();
  const hotTitles = meta?.hotTitles ?? [];

  function submit(r?: string) {
    const final = (r ?? role).trim();
    if (!final) return;
    create.mutate(
      { role: final, country, remote },
      { onSuccess: (res) => router.push(`/jobs/${res.search.id}`) },
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          — Job Search
        </div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
          Find roles <em className="italic">before</em> they hit the job boards.
        </h1>
        <p className="max-w-2xl text-[14px] text-fg-muted">
          We crawl 200+ company career pages directly. AI-scored relevance, salary
          extraction, remote-friendly filters — all in one place.
        </p>
      </div>

      <div className="flex items-stretch gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
        <div className="flex items-center pl-2 text-fg-muted">
          <Briefcase className="h-4 w-4" />
        </div>
        <Input
          autoFocus
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Senior Frontend Engineer, Product Designer, Staff PM…"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-9 flex-1 border-0 bg-transparent text-[14px] shadow-none focus-visible:ring-0"
        />
        <span className="grid h-9 w-9 place-items-center rounded-md border border-border bg-bg-sunk font-mono text-[11px] text-fg-subtle">
          ⏎
        </span>
        <Button loading={create.isPending} onClick={() => submit()}>
          Search <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRemote((r) => !r)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px]",
            remote
              ? "border-fg bg-fg text-bg-elev"
              : "border-border bg-card text-fg hover:bg-bg-sunk",
          )}
        >
          <Globe className="h-3.5 w-3.5" />
          Remote OK
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
            Country
          </span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-transparent text-[12px]"
          >
            {(meta?.countries ?? []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hotTitles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            Hot titles
          </span>
          {hotTitles.map((t) => (
            <button
              key={t}
              onClick={() => {
                setRole(t);
                submit(t);
              }}
              className="rounded-full border border-border bg-card px-3 py-1 text-[12px] text-fg hover:bg-bg-sunk"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <StatsRow meta={meta} />
    </>
  );
}

function StatsRow({ meta }: { meta: JobsMetaResponse | null }) {
  const items = [
    {
      ico: <Building2 className="h-4 w-4" />,
      k: meta ? `${meta.stats.trackedCompanies}+` : "—",
      l: "company pages",
    },
    {
      ico: <RefreshCw className="h-4 w-4" />,
      k: meta ? `${meta.stats.averageCrawlCadenceMin} min` : "—",
      l: "avg crawl cadence",
    },
    {
      ico: <Briefcase className="h-4 w-4" />,
      k: meta ? abbreviate(meta.stats.liveRoles) : "—",
      l: "live roles",
    },
    {
      ico: <Bell className="h-4 w-4 text-primary" />,
      k: "Alerts",
      l: "on saved searches",
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

function RecentSearches({
  items,
  loading,
}: {
  items: JobSearchView[];
  loading: boolean;
}) {
  const del = useDeleteJobSearch();
  const [pending, setPending] = useState<JobSearchView | null>(null);
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
              href={`/jobs/${s.id}`}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 pr-10 text-left transition hover:border-fg/30 hover:shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                  {recencyLabel(s.createdAt)}
                </span>
                <SearchStatusPill status={s.status} />
              </div>
              <div className="line-clamp-2 text-[14px] font-medium leading-snug">
                {s.role}
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-fg-muted">
                {s.country && <span>{s.country}</span>}
                {s.remote && (
                  <>
                    <span className="text-fg-subtle">·</span>
                    <span>Remote OK</span>
                  </>
                )}
                {typeof s.resultCount === "number" && (
                  <>
                    <span className="text-fg-subtle">·</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                      {s.resultCount} {s.resultCount === 1 ? "match" : "matches"}
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
        title="Delete job search?"
        description={
          pending
            ? `This will permanently delete the search for "${pending.role}" and all its results. This cannot be undone.`
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

function SearchStatusPill({ status }: { status: JobSearchView["status"] }) {
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
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function recencyLabel(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
