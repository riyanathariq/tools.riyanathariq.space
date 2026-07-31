"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AuthButton } from "@/components/auth-button";
import { ToolsSidebar } from "@/components/tools-sidebar";
import { VisitorBeacon } from "@/components/visitor-beacon";
import { getToolBySlug } from "@/data/tools-registry";
import { cn } from "@/lib/utils";

export function ToolsShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeSlug = pathname?.startsWith("/t/") ? pathname.slice(3).split("/")[0] : undefined;
  const tool = activeSlug ? getToolBySlug(activeSlug) : undefined;
  const title = tool?.name ?? "Developer Tools";

  return (
    <div className="relative flex min-h-dvh bg-zinc-950 text-zinc-100">
      <VisitorBeacon />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(39 39 42 / 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgb(39 39 42 / 0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at top, black 20%, transparent 75%)",
        }}
      />

      <div className="relative z-20 hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72">
        <ToolsSidebar activeSlug={activeSlug} />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/60 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close overlay"
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <ToolsSidebar
            activeSlug={activeSlug}
            open={open}
            onClose={() => setOpen(false)}
          />
        </div>
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-4 backdrop-blur-xl">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-zinc-800 text-zinc-200 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open tools menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100 lg:hidden">{title}</p>
            <p className="hidden text-sm text-zinc-500 lg:block">
              Local tools run in-browser · Premium tools need sign-in
            </p>
          </div>
          <AuthButton />
        </header>
        <main className="flex-1 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
