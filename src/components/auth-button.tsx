"use client";

import { LogIn, LogOut } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { loginWithGoogle } from "@/lib/api";

export function AuthButton() {
  const { user, logout } = useAuth();

  if (user === undefined) {
    return <span className="text-xs text-zinc-500">…</span>;
  }

  if (!user) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-9 min-h-9 shrink-0 px-3"
        onClick={() => loginWithGoogle(window.location.pathname)}
      >
        <LogIn className="size-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {user.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.picture}
          alt=""
          className="size-8 shrink-0 rounded-full border border-zinc-700"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="hidden max-w-[9rem] truncate text-xs text-zinc-400 md:inline">
        {user.email}
      </span>
      <Button
        type="button"
        variant="ghost"
        className="h-9 min-h-9 shrink-0 px-2.5"
        aria-label="Sign out"
        onClick={() => void logout()}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
