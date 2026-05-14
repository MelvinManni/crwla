"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignin } from "@/lib/queries/auth";

export default function SigninPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signin = useSignin();

  function submit() {
    if (signin.isPending || signin.isSuccess) return;
    if (!email || !password) {
      setError("email and password required");
      return;
    }
    setError(null);
    signin.mutate(
      { email, password },
      {
        onSuccess: () => {
          // Hard navigation so the browser re-issues a request to /dashboard
          // with the just-set crwla_token cookie. `router.push` races with
          // cookie persistence and can bounce the user back via middleware.
          window.location.assign("/dashboard");
        },
        onError: (e) => setError((e as Error).message),
      },
    );
  }

  const busy = signin.isPending || signin.isSuccess;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-10">
      <div className="flex flex-col items-start gap-3.5">
        <div className="grid h-11 w-11 place-items-center rounded-[10px] bg-fg font-mono text-[15px] font-semibold text-bg-elev">
          CR
        </div>
        <div>
          <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">
            Sign in to CRWLA
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
            Internal research tool. Access is granted by an admin — request
            below if you don't have an account.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3.5">
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
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="h-11 rounded-lg bg-bg-elev px-3 text-[14px]"
          />
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
          Sign in
        </Button>
        <p className="mt-2 text-center text-[12px] text-fg-muted">
          No account yet?{" "}
          <Link
            href="/request-access"
            className="font-medium text-fg underline underline-offset-2"
          >
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
