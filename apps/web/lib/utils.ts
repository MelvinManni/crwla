import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function relTime(t: number | string | Date | null | undefined): string {
  if (!t) return 'never';
  const ms = typeof t === 'number' ? t : new Date(t).getTime();
  const diff = Date.now() - ms;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function relUntil(t: number | string | Date | null | undefined): string {
  if (!t) return 'manual';
  const ms = typeof t === 'number' ? t : new Date(t).getTime();
  const diff = ms - Date.now();
  if (diff <= 0) return 'soon';
  const m = Math.round(diff / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h}h`;
  const d = Math.round(h / 24);
  return `in ${d}d`;
}
