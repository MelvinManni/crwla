import { applyDecorators } from '@nestjs/common';
import { IsStrongPassword, IsString } from 'class-validator';

/**
 * Single source of truth for the password policy, enforced on every endpoint
 * where a user sets a login password (signup, request-access, change-password,
 * admin-created users). The frontend mirrors this exact policy in
 * `apps/web/lib/password.ts` — keep the two in sync.
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
} as const;

export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.';

/** Composed property decorator: a string that satisfies {@link PASSWORD_POLICY}. */
export function IsStrongPasswordField(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    IsStrongPassword(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE }),
  );
}
