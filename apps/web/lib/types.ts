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
};

export type AlertFrequency = 'REALTIME' | 'HOURLY' | 'DAILY';

export type AlertView = {
  id: string;
  userId: string;
  searchId: string | null;
  keyword: string;
  sources: string[];
  locations: string[];
  frequency: AlertFrequency;
  active: boolean;
  lastTriggered: string | null;
  createdAt: string;
};
