"use client";

import { useState } from "react";
import {
  AlertCircle,
  Edit,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useCreateTrackedCompany,
  useDeleteTrackedCompany,
  useTrackedCompanies,
  useUpdateTrackedCompany,
  type TrackedCompanyView,
} from "@/lib/queries/job-search";

type FormState = {
  id: string | null;
  name: string;
  careerUrl: string;
  selector: string;
  crawlIntervalMin: number;
  status: "ACTIVE" | "PAUSED";
};

const EMPTY: FormState = {
  id: null,
  name: "",
  careerUrl: "",
  selector: "",
  crawlIntervalMin: 15,
  status: "ACTIVE",
};

export function TrackedCompaniesClient({
  initial,
}: {
  initial: TrackedCompanyView[];
}) {
  const [q, setQ] = useState("");
  const { data } = useTrackedCompanies(q || undefined);
  const items = data?.items ?? initial;
  const erroredCount = items.filter((c) => c.status === "ERROR").length;

  const [form, setForm] = useState<FormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TrackedCompanyView | null>(null);
  const create = useCreateTrackedCompany();
  const update = useUpdateTrackedCompany();
  const del = useDeleteTrackedCompany();

  function startAdd() {
    setForm({ ...EMPTY });
  }
  function startEdit(c: TrackedCompanyView) {
    setForm({
      id: c.id,
      name: c.name,
      careerUrl: c.careerUrl,
      selector: c.selector ?? "",
      crawlIntervalMin: c.crawlIntervalMin,
      status: c.status === "ERROR" ? "ACTIVE" : (c.status as "ACTIVE" | "PAUSED"),
    });
  }
  function close() {
    setForm(null);
  }
  function save() {
    if (!form) return;
    const payload = {
      name: form.name.trim(),
      careerUrl: form.careerUrl.trim(),
      selector: form.selector.trim() || undefined,
      crawlIntervalMin: form.crawlIntervalMin,
    };
    if (form.id) {
      update.mutate(
        { id: form.id, ...payload, active: form.status === "ACTIVE" },
        { onSuccess: close },
      );
    } else {
      create.mutate(payload, { onSuccess: close });
    }
  }
  function toggle(c: TrackedCompanyView) {
    update.mutate({
      id: c.id,
      active: c.status !== "ACTIVE",
    });
  }
  function remove(c: TrackedCompanyView) {
    setPendingDelete(c);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            — Admin · Job sources
          </div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
            Tracked <em className="italic">companies.</em>
          </h1>
          <p className="text-[13px] text-fg-muted">
            Career pages we crawl. Add new sources, pause noisy ones, fix errors.
          </p>
        </div>
        <Button onClick={startAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add company
        </Button>
      </div>

      {erroredCount > 0 && (
        <Card className="flex items-start gap-3 border-orange-200 bg-orange-50 p-3 text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-[13px]">
            <strong>{erroredCount}</strong>{" "}
            {erroredCount === 1 ? "source has" : "sources have"} an error. Click the
            affected row to update its selector.
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-fg-subtle" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company name or URL…"
            className="h-9 pl-8"
          />
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Crawl all now
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Career URL</TableHead>
              <TableHead>Last crawled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-fg-muted">
                  <Search className="mx-auto mb-2 h-5 w-5" />
                  <p className="text-[13px]">No tracked companies yet — add one to start crawling.</p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-md bg-bg-sunk font-mono text-[11px] font-semibold">
                        {c.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-[13px]">{c.name}</div>
                        <div className="font-mono text-[10px] text-fg-subtle">
                          {c.jobCount} live roles
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={
                        /^https?:\/\//.test(c.careerUrl)
                          ? c.careerUrl
                          : `https://${c.careerUrl}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-fg hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate">{c.careerUrl}</span>
                    </a>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-fg-muted">
                    {c.lastCrawled ? relativeTime(c.lastCrawled) : "never"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]",
                        c.status === "ACTIVE" &&
                          "border-leaf/30 bg-leaf/10 text-leaf",
                        c.status === "PAUSED" &&
                          "border-border bg-bg-sunk text-fg-muted",
                        c.status === "ERROR" &&
                          "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-200",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          c.status === "ACTIVE" && "bg-leaf",
                          c.status === "PAUSED" && "bg-fg-subtle",
                          c.status === "ERROR" && "bg-orange-500",
                        )}
                      />
                      {c.status === "ACTIVE"
                        ? "Active"
                        : c.status === "PAUSED"
                          ? "Paused"
                          : "Error"}
                    </span>
                    {c.lastError && (
                      <div className="mt-1 font-mono text-[10px] text-orange-700">
                        {c.lastError}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => startEdit(c)}
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggle(c)}
                        title={c.status === "ACTIVE" ? "Pause" : "Activate"}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(c)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between font-mono text-[11px] text-fg-muted">
        <span>
          Showing {items.length} {items.length === 1 ? "company" : "companies"}
        </span>
        <span>Crawler · queue: 0</span>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form?.id ? "Edit company" : "Add tracked company"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <Field label="Company name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Anthropic"
                />
              </Field>
              <Field label="Career page URL">
                <Input
                  value={form.careerUrl}
                  onChange={(e) => setForm({ ...form, careerUrl: e.target.value })}
                  placeholder="anthropic.com/careers"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Crawl interval">
                  <select
                    value={form.crawlIntervalMin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        crawlIntervalMin: Number(e.target.value),
                      })
                    }
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]"
                  >
                    <option value={5}>Every 5 min</option>
                    <option value={15}>Every 15 min</option>
                    <option value={60}>Hourly</option>
                    <option value={1440}>Daily</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as "ACTIVE" | "PAUSED",
                      })
                    }
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                  </select>
                </Field>
              </div>
              <Field
                label="Selector override"
                hint="Leave blank to use auto-detection."
              >
                <Input
                  value={form.selector}
                  onChange={(e) => setForm({ ...form, selector: e.target.value })}
                  placeholder=".job-listing > a"
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={save}
              loading={create.isPending || update.isPending}
              disabled={!form?.name.trim() || !form?.careerUrl.trim()}
            >
              {form?.id ? "Save changes" : "Add company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove tracked company?"
        description={
          pendingDelete
            ? `${pendingDelete.name} will no longer be crawled. Existing job results from this company stay in past searches but are unlinked. This cannot be undone.`
            : undefined
        }
        confirmLabel="Remove company"
        destructive
        onConfirm={() => {
          if (pendingDelete) del.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </span>
      {children}
      {hint && (
        <span className="font-mono text-[10px] text-fg-subtle">{hint}</span>
      )}
    </label>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
