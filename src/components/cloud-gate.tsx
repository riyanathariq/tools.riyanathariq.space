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
      <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 px-4">
        <p className="animate-pulse text-sm text-zinc-500">Checking session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-12 text-center sm:px-6 sm:py-16">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <Crown className="size-6" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-medium text-zinc-100">
            Need to sign in for {toolName}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-500">
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
