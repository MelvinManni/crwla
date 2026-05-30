// Mirrors apps/api DTOs. Duplicated by design — see HARNESS.md §5.

export type Role = 'ADMIN' | 'MEMBER';
export type CronPreset = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL';
export type SearchStatus = 'RUNNING' | 'PAUSED' | 'ERROR';
export type RunStatus = 'RUNNING' | 'OK' | 'ERROR';

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: Role;
  team: string | null;
  /** False until the user confirms via the emailed verification link. The
   *  (app) layout redirects unverified users to /verify-email. */
  emailVerified: boolean;
};

export type SearchView = {
  id: string;
  name: string;
  keywords: string[];
  locations: string[];
  sources: string[];
  cron: CronPreset;
  cronLabel: string;
  status: SearchStatus;
  filterPrompt: string;
  strict: boolean;
  lastRun: string;
  nextRun: string;
  results: number;
  lastError: string | null;
  ownerId: string;
  createdAt: number;
  publicAccess: boolean;
  shareSlug: string | null;
};

// Mirror of `PublicSharedView` from apps/api/src/modules/share/share.service.ts.
// Internal CUIDs are intentionally absent — see that file for the
// public-contract checklist.
export type SharedSearchView = {
  search: {
    slug: string;
    name: string;
    keywords: string[];
    ownerName: string;
    lastRun: string;
  };
  results: Array<{
    title: string;
    url: string;
    snippet: string | null;
    source: string;
    image: string | null;
    publishedAt: number | null;
    time: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ResultView = {
  id: string;
  source: string;
  title: string;
  url: string;
  snippet: string | null;
  image: string | null;
  tag: string | null;
  time: string | null;
  publishedAt: number | null;
  favorite: boolean;
};

export type RunView = {
  id: string;
  startedAt: number;
  time: string;
  duration: string;
  count: number;
  status: RunStatus;
  error: string | null;
};

export type AccessRequestView = {
  id: string;
  name: string;
  email: string;
  team: string;
  reason: string;
  requested: string;
};

export type UserAdminView = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  team: string;
  role: 'Admin' | 'Member';
  last: string;
  active: boolean;
  disabledSourceCategories: string[];
};

export type MemberSubscriptionView = {
  status: string;
  interval: 'MONTH' | 'YEAR';
  planTier: string;
  planName: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  seats: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string;
};

export type MemberActivityStats = {
  total: number;
  windowDays: number;
  byType: Array<{ type: string; label: string; count: number }>;
  daily: Array<{ day: string; count: number }>;
  recent: Array<{
    id: string;
    type: string;
    label: string;
    targetId: string | null;
    metadata: unknown;
    at: number;
  }>;
  types: ReadonlyArray<string>;
};

export type MemberDetailResponse = {
  user: UserAdminView & {
    lastActiveAt: string | null;
    createdAt: string;
    searchCount: number;
    alertCount: number;
  };
  subscription: MemberSubscriptionView | null;
  stats: MemberActivityStats;
};

export type SourceCategory = 'news' | 'social' | 'forums' | 'blogs';

export type SourceMeta = {
  id: string;
  label: string;
  category: SourceCategory;
};

export type SourcesResponse = {
  categories: ReadonlyArray<SourceCategory>;
  disabledCategories: SourceCategory[];
  sources: SourceMeta[];
  all: SourceMeta[];
};
