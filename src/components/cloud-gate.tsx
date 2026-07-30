"use client";

import { Cloud, LogIn } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { fetchMe, loginWithGoogle, type AuthUser } from "@/lib/api";

export function CloudGate({
  children,
  toolName,
}: {
  children: ReactNode;
  toolName: string;
}) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (user === undefined) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
        <p className="animate-pulse text-sm text-zinc-500">Checking session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 px-6 py-16 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <Cloud className="size-6" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-medium text-zinc-100">Sign in to use {toolName}</h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            Cloud tool — needs the Go API backend. Local tools stay free in your browser without
            login.
          </p>
        </div>
        <Button type="button" onClick={() => loginWithGoogle(window.location.pathname)}>
          <LogIn className="size-4" />
          Sign in with Google
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
