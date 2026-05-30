// Password policy — mirror of the backend's single source of truth in
// apps/api/src/common/validators/strong-password.decorator.ts (which uses
// class-validator's IsStrongPassword with these same minimums). Keep the two
// in sync; the backend is the authority and re-validates every submission.

export type PasswordRuleResult = { id: string; label: string; met: boolean };

const RULES: ReadonlyArray<{ id: string; label: string; test: (pw: string) => boolean }> = [
  { id: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'lower', label: 'A lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { id: 'upper', label: 'An uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'number', label: 'A number', test: (pw) => /[0-9]/.test(pw) },
  { id: 'symbol', label: 'A symbol', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.';

export function checkPassword(pw: string): { ok: boolean; results: PasswordRuleResult[] } {
  const results = RULES.map((r) => ({ id: r.id, label: r.label, met: r.test(pw) }));
  return { ok: results.every((r) => r.met), results };
}

export function isStrongPassword(pw: string): boolean {
  return checkPassword(pw).ok;
}
