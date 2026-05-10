// Read/write list-page state (page, pageSize, view) on the URL.
// Server components read from `searchParams`; client components push via
// `useRouter()` to keep the URL canonical and shareable.

export type ViewMode = 'list' | 'grid';

export type ListParams = {
  page: number;
  pageSize: number;
  view: ViewMode;
};

export function parseListParams(
  raw: Record<string, string | string[] | undefined>,
  defaults: { pageSize?: number; view?: ViewMode } = {},
): ListParams {
  const page = clamp(toInt(raw.page) ?? 1, 1, 10_000);
  const pageSize = clamp(toInt(raw.pageSize) ?? defaults.pageSize ?? 20, 1, 100);
  const viewRaw = pickStr(raw.view);
  const view: ViewMode = viewRaw === 'grid' ? 'grid' : viewRaw === 'list' ? 'list' : (defaults.view ?? 'list');
  return { page, pageSize, view };
}

export function buildListSearch(
  base: string,
  params: Partial<ListParams>,
  current: ListParams,
): string {
  const merged = { ...current, ...params };
  const sp = new URLSearchParams();
  if (merged.page > 1) sp.set('page', String(merged.page));
  if (merged.pageSize !== 20) sp.set('pageSize', String(merged.pageSize));
  if (merged.view !== 'list') sp.set('view', merged.view);
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
function toInt(v: string | string[] | undefined): number | undefined {
  const s = pickStr(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
