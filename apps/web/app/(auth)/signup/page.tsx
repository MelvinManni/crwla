"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { isStrongPassword } from "@/lib/password";
import { useSignup } from "@/lib/queries/auth";
import { useRecaptchaToken } from "@/lib/use-recaptcha";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signup = useSignup();
  const getRecaptchaToken = useRecaptchaToken();

  async function submit() {
    if (signup.isPending || signup.isSuccess) return;
    if (!firstName || !email || !password) {
      setError("first name, email and password required");
      return;
    }
    if (!isStrongPassword(password)) {
      setError("Please choose a stronger password.");
      return;
    }
    setError(null);
    const recaptchaToken = await getRecaptchaToken("signup");
    signup.mutate(
      { firstName, lastName: lastName || undefined, email, password, recaptchaToken },
      {
        onSuccess: () => {
          // Account created + signed in (cookie set) but unverified. Send them
          // to /verify-email (outside the (auth) group, so the signed-in guard
          // doesn't bounce them to a gated /dashboard). Hard nav so the cookie
          // is in place for the next request.
          window.location.assign("/verify-email");
        },
        onError: (e) => setError((e as Error).message),
      },
    );
  }

  const busy = signup.isPending || signup.isSuccess;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-10">
      <div className="flex flex-col items-start gap-3.5">
        <div className="grid h-11 w-11 place-items-center rounded-[10px] bg-fg font-mono text-[15px] font-semibold text-bg-elev">
          CR
        </div>
        <div>
          <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">
            Create your CRWLA account
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
            Start crawling in minutes. We'll send a link to verify your email.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3.5">
        <GoogleButton label="Sign up with Google" />

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="firstName" className="text-[12px] font-medium">
              First name
            </Label>
            <Input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Ada"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="h-11 rounded-lg bg-bg-elev px-3 text-[14px]"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="lastName" className="text-[12px] font-medium">
              Last name
            </Label>
            <Input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Lovelace"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="h-11 rounded-lg bg-bg-elev px-3 text-[14px]"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-[12px] font-medium">
            Work email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="h-11 rounded-lg bg-bg-elev px-3 text-[14px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-[12px] font-medium">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="h-11 rounded-lg bg-bg-elev px-3 text-[14px]"
          />
          <PasswordRequirements value={password} />
        </div>
        {error && (
          <p className="font-mono text-[11px] text-status-red">{error}</p>
        )}
        <Button
          size="lg"
          className="h-11 w-full rounded-lg bg-fg text-[14px] text-bg-elev hover:bg-fg/90"
          onClick={submit}
          loading={busy}
        >
          Create account
        </Button>
        <p className="mt-2 text-center text-[12px] text-fg-muted">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="font-medium text-fg underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
