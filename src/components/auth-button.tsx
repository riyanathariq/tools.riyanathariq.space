"use client";

import { LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchMe, loginWithGoogle, logout, type AuthUser } from "@/lib/api";

export function AuthButton() {
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
    return <span className="text-xs text-zinc-500">…</span>;
  }

  if (!user) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-9 min-h-9 px-3"
        onClick={() => loginWithGoogle(window.location.pathname)}
      >
        <LogIn className="size-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.picture}
          alt=""
          className="size-8 rounded-full border border-zinc-700"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="hidden max-w-[9rem] truncate text-xs text-zinc-400 md:inline">
        {user.email}
      </span>
      <Button
        type="button"
        variant="ghost"
        className="h-9 min-h-9 px-2.5"
        onClick={async () => {
          await logout();
          setUser(null);
        }}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
