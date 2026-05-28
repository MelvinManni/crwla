"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  ExternalLink,
  Globe,
  MapPin,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useDeleteJobSearch,
  useJobSearchResults,
  type JobResultView,
} from "@/lib/queries/job-search";

export function JobResultsClient({ searchId }: { searchId: string }) {
  const router = useRouter();
  const { data, isLoading } = useJobSearchResults(searchId);
  const del = useDeleteJobSearch();
  const [sort, setSort] = useState<"relevance" | "newest" | "salary">("relevance");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const search = data?.search;
  const jobs = useMemo(() => {
    const xs = data?.results ?? [];
    const copy = [...xs];
    switch (sort) {
      case "newest":
        return copy.sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
      case "salary":
        return copy.sort((a, b) => (b.salaryMax ?? 0) - (a.salaryMax ?? 0));
      default:
        return copy.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
  }, [data, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/jobs" />}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All searches
        </Button>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          — Roles
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
        title="Delete job search?"
        description={
          search
            ? `This will permanently delete the search for "${search.role}" and all its results. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete search"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          del.mutate(searchId, { onSuccess: () => router.push("/jobs") });
        }}
      />

      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">
          Roles matching <em className="italic">&ldquo;{search?.role ?? "…"}&rdquo;</em>
        </h1>
        <p className="text-[13px] text-fg-muted">
          {search?.status === "RUNNING" || search?.status === "PENDING"
            ? "Crawling tracked companies — results stream in."
            : `${jobs.length} ${jobs.length === 1 ? "role" : "roles"} from tracked companies. Sorted by ${sort}.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="font-mono text-[11px] text-fg-subtle">
          <em className="not-italic text-fg">{jobs.length}</em> roles
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
          >
            <option value="relevance">Most relevant</option>
            <option value="newest">Newest</option>
            <option value="salary">Highest salary</option>
          </select>
          <Button variant="outline" size="sm">
            <Bell className="mr-1 h-3.5 w-3.5" /> Alert me
          </Button>
        </div>
      </div>

      {isLoading ||
      search?.status === "RUNNING" ||
      search?.status === "PENDING" ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-2 h-4 w-1/2" />
              <Skeleton className="mb-2 h-3 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-10 text-center text-fg-muted">
          <Briefcase className="h-5 w-5" />
          <p className="text-[13px]">No strong matches yet — try a different role or country.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: JobResultView }) {
  const sym = currencySymbol(job.currency);
  const range = formatSalary(job, sym);
  const relevanceTier =
    job.relevanceScore >= 85
      ? "strong"
      : job.relevanceScore >= 75
        ? "good"
        : "low";

  return (
    <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-bg-sunk font-mono text-[13px] font-semibold text-fg">
        {job.companyName[0]}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="text-[15px] font-semibold leading-tight">{job.title}</div>
        <div className="flex flex-wrap items-center gap-1 text-[12px] text-fg-muted">
          <span>{job.companyName}</span>
          <span className="text-fg-subtle">·</span>
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
          )}
          {job.postedAt && (
            <>
              <span className="text-fg-subtle">·</span>
              <span className="font-mono text-[11px]">{relativeTime(job.postedAt)}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {job.remote && (
            <span className="inline-flex items-center gap-1 rounded border border-border bg-bg-sunk px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted">
              <Globe className="h-2.5 w-2.5" /> Remote
            </span>
          )}
          {job.tags.map((t) => (
            <span
              key={t}
              className="rounded border border-border bg-bg-sunk px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
            Relevance
          </span>
          <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-bg-sunk">
            <div
              className={cn(
                "h-full rounded-full",
                relevanceTier === "strong" && "bg-leaf",
                relevanceTier === "good" && "bg-amber-500",
                relevanceTier === "low" && "bg-fg-subtle",
              )}
              style={{ width: `${job.relevanceScore}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-fg-muted">{job.relevanceScore}%</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="text-right">
          <div className="text-[13px] font-semibold">{range}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
            salary range
          </div>
        </div>
        <Button size="sm" render={<a href={job.url} target="_blank" rel="noreferrer" />}>
          Apply <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}

function currencySymbol(ccy: string | null): string {
  switch (ccy) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "NGN":
      return "₦";
    default:
      return ccy ? `${ccy} ` : "$";
  }
}

function formatSalary(job: JobResultView, sym: string): string {
  if (job.salaryMin == null && job.salaryMax == null) return "Not posted";
  const min = job.salaryMin;
  const max = job.salaryMax;
  const period = job.salaryPeriod === "month" ? "M/mo" : "k";
  if (job.salaryPeriod === "month") {
    return `${sym}${formatMillions(min)}–${sym}${formatMillions(max)}${period}`;
  }
  return `${sym}${k(min)}–${sym}${k(max)}k`;
}

function k(n: number | null): string {
  if (n == null) return "?";
  return Math.round(n / 1000).toString();
}

function formatMillions(n: number | null): string {
  if (n == null) return "?";
  return (n / 1_000_000).toFixed(0);
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.round(diff / 3600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
