"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkPassword } from "@/lib/password";

/**
 * Live checklist of the password policy. Renders nothing until the user has
 * typed something, so an empty field isn't a wall of red. Mirrors the backend
 * policy in apps/api/src/common/validators/strong-password.decorator.ts.
 */
export function PasswordRequirements({ value }: { value: string }) {
  if (!value) return null;
  const { results } = checkPassword(value);
  return (
    <ul className="flex flex-col gap-1" aria-label="Password requirements">
      {results.map((r) => (
        <li
          key={r.id}
          className={cn(
            "flex items-center gap-1.5 font-mono text-[11px] transition-colors",
            r.met ? "text-status-green" : "text-fg-muted",
          )}
        >
          {r.met ? (
            <Check className="size-3" aria-hidden />
          ) : (
            <Circle className="size-3" aria-hidden />
          )}
          {r.label}
        </li>
      ))}
    </ul>
  );
}
