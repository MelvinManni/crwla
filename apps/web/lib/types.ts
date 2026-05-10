// Mirrors apps/api DTOs. Duplicated by design — see HARNESS.md §5.

export type Role = 'ADMIN' | 'MEMBER';
export type CronPreset = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL';
export type SearchStatus = 'RUNNING' | 'PAUSED' | 'ERROR';
export type RunStatus = 'RUNNING' | 'OK' | 'ERROR';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  team: string | null;
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
  lastRun: string;
  nextRun: string;
  results: number;
  lastError: string | null;
  ownerId: string;
  createdAt: number;
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
  name: string;
  email: string;
  team: string;
  role: 'Admin' | 'Member';
  last: string;
  active: boolean;
  disabledSourceCategories: string[];
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
