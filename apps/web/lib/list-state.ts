// Read/write list-page state (page, pageSize, view, filters) on the URL.
// Server components read from `searchParams`; client components push via
// `useRouter()` to keep the URL canonical and shareable.

export type ViewMode = 'list' | 'grid';
export type TimeWindow = 'all' | '24h' | '7d' | '30d' | '90d';
/** Result sort keys understood by the API. Format: `<field>-<dir>`. */
export type ResultSort =
  | 'when-desc'
  | 'when-asc'
  | 'source-asc'
  | 'source-desc'
  | 'title-asc'
  | 'title-desc';

export const DEFAULT_RESULT_SORT: ResultSort = 'when-desc';

export type ListParams = {
  page: number;
  pageSize: number;
  view: ViewMode;
  q: string;
  keyword: string;
  time: TimeWindow;
  sort: ResultSort;
};

const TIME_WINDOWS: ReadonlySet<TimeWindow> = new Set([
  'all',
  '24h',
  '7d',
  '30d',
  '90d',
]);

const RESULT_SORTS: ReadonlySet<ResultSort> = new Set([
  'when-desc',
  'when-asc',
  'source-asc',
  'source-desc',
  'title-asc',
  'title-desc',
]);

export function parseListParams(
  raw: Record<string, string | string[] | undefined>,
  defaults: { pageSize?: number; view?: ViewMode } = {},
): ListParams {
  const page = clamp(toInt(raw.page) ?? 1, 1, 10_000);
  const pageSize = clamp(toInt(raw.pageSize) ?? defaults.pageSize ?? 20, 1, 100);
  const viewRaw = pickStr(raw.view);
  const view: ViewMode =
    viewRaw === 'grid'
      ? 'grid'
      : viewRaw === 'list'
        ? 'list'
        : (defaults.view ?? 'list');
  const q = pickStr(raw.q)?.trim() ?? '';
  const keyword = pickStr(raw.keyword)?.trim() ?? '';
  const timeRaw = pickStr(raw.time) as TimeWindow | undefined;
  const time: TimeWindow = timeRaw && TIME_WINDOWS.has(timeRaw) ? timeRaw : 'all';
  const sortRaw = pickStr(raw.sort) as ResultSort | undefined;
  const sort: ResultSort =
    sortRaw && RESULT_SORTS.has(sortRaw) ? sortRaw : DEFAULT_RESULT_SORT;
  return { page, pageSize, view, q, keyword, time, sort };
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
  if (merged.q) sp.set('q', merged.q);
  if (merged.keyword) sp.set('keyword', merged.keyword);
  if (merged.time !== 'all') sp.set('time', merged.time);
  if (merged.sort !== DEFAULT_RESULT_SORT) sp.set('sort', merged.sort);
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

/** Convert a TimeWindow label to a Date cutoff (inclusive). `null` = no filter. */
export function timeWindowToCutoff(t: TimeWindow): Date | null {
  switch (t) {
    case '24h':
      return new Date(Date.now() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
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
