/**
 * Helpers for the firstName/lastName split. A user's display name is stored as
 * two columns (`firstName` required, `lastName` optional). These keep the
 * "one full string in, two fields out" (and back) logic in one place so
 * signup, Google sign-in, admin create, and the seed admin all agree.
 */

/** Split a free-text full name into first + last (everything after token 1). */
export function splitName(full: string | null | undefined): {
  firstName: string;
  lastName: string | null;
} {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? '';
  const lastName = parts.join(' ');
  return { firstName, lastName: lastName || null };
}

/** Join first + last back into a display string (handles a null last name). */
export function fullName(u: { firstName: string; lastName: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
}
