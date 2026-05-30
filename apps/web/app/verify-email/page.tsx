"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useMe,
  useResendVerification,
  useSignout,
  useVerifyEmail,
} from "@/lib/queries/auth";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-10">
      <div className="flex flex-col items-start gap-3.5">
        <div className="grid h-11 w-11 place-items-center rounded-[10px] bg-fg font-mono text-[15px] font-semibold text-bg-elev">
          CR
        </div>
        {children}
      </div>
    </div>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const router = useRouter();
  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const signout = useSignout();
  // Best-effort: show which address the link went to. Errors (no session) are
  // fine — the page still works for someone clicking the link logged-out.
  const me = useMe();
  const email = me.data?.email;
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const attempted = useRef(false);

  function switchAccount() {
    signout.mutate(undefined, {
      onSettled: () => router.push("/signin"),
    });
  }

  // Auto-confirm when arriving from the emailed link (?token=…). Runs once.
  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    verify.mutate(
      { token },
      {
        onSuccess: () => window.location.assign("/dashboard"),
        onError: (e) => setError((e as Error).message),
      },
    );
  }, [token, verify]);

  // --- Confirming via emailed link -------------------------------------
  if (token) {
    if (error) {
      return (
        <Shell>
          <div>
            <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">
              Verification failed
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
              {error}. The link may have expired — sign in to request a new one.
            </p>
          </div>
          <Button
            size="lg"
            className="mt-6 h-11 w-full rounded-lg bg-fg text-[14px] text-bg-elev hover:bg-fg/90"
            render={<Link href="/signin" />}
          >
            Go to sign in
          </Button>
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="flex items-center gap-3">
          <Spinner />
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]">
            Verifying your email…
          </h1>
        </div>
      </Shell>
    );
  }

  // --- Post-signup "check your inbox" ----------------------------------
  return (
    <Shell>
      <div>
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">
          Check your inbox
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
          We sent a verification link to{" "}
          {email ? (
            <span className="font-medium text-fg">{email}</span>
          ) : (
            "your email"
          )}
          . Click it to finish setting up your account. The link expires in 24
          hours.
        </p>
      </div>

      <div className="mt-6 flex w-full flex-col gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full rounded-lg text-[14px]"
          loading={resend.isPending}
          onClick={() => {
            if (resend.isPending) return;
            setError(null);
            resend.mutate(undefined, {
              onSuccess: () => setResent(true),
              onError: (e) => setError((e as Error).message),
            });
          }}
        >
          {resent ? "Verification email sent" : "Resend verification email"}
        </Button>
        {error && (
          <p className="font-mono text-[11px] text-status-red">{error}</p>
        )}
        <p className="text-center text-[12px] text-fg-muted">
          Wrong account?{" "}
          <button
            type="button"
            onClick={switchAccount}
            className="font-medium text-fg underline underline-offset-2"
          >
            Sign out
          </button>
        </p>
      </div>
    </Shell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <Spinner />
        </Shell>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
