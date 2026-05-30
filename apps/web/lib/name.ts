// Display helpers for the firstName/lastName split. Mirrors the API's
// common/name.util so the two stay in agreement.

export function fullName(u: { firstName: string; lastName?: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
}

export function initials(u: { firstName: string; lastName?: string | null }): string {
  const a = u.firstName?.trim()?.[0] ?? '';
  const b = u.lastName?.trim()?.[0] ?? '';
  const out = (a + b).toUpperCase();
  return out || (u.firstName?.slice(0, 2).toUpperCase() ?? '?');
}
