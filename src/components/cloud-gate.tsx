"use client";

import { Crown, LogIn } from "lucide-react";
import type { ReactNode } from "react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { loginWithGoogle } from "@/lib/api";

export function CloudGate({
  children,
  toolName,
}: {
  children: ReactNode;
  toolName: string;
}) {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-line bg-raised px-4">
        <p className="animate-pulse text-sm text-ink-faint">Checking session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-line-strong bg-raised px-4 py-12 text-center sm:px-6 sm:py-16">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-premium bg-premium-soft text-premium-ink">
          <Crown className="size-6" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-semibold text-ink">
            Need to sign in for {toolName}
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Premium Tool — runs on the Go API backend. Local tools stay free in your browser
            without login.
          </p>
        </div>
        <Button
          type="button"
          className="w-full max-w-xs sm:w-auto"
          onClick={() => loginWithGoogle(window.location.pathname)}
        >
          <LogIn className="size-4" />
          Sign in with Google
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
