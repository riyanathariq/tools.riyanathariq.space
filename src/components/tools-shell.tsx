"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AuthButton } from "@/components/auth-button";
import { ToolsSidebar } from "@/components/tools-sidebar";
import { VisitorBeacon } from "@/components/visitor-beacon";
import { getToolBySlug } from "@/data/tools-registry";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/types/tool";

export function ToolsShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeSlug = pathname?.startsWith("/t/") ? pathname.slice(3).split("/")[0] : undefined;
  const tool = activeSlug ? getToolBySlug(activeSlug) : undefined;
  const onTool = Boolean(tool);

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
        <header className="sticky top-0 z-30 border-b border-emerald-500/10 bg-zinc-950/90 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-200 hover:border-emerald-500/30 hover:text-emerald-200 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open tools menu"
            >
              <Menu className="size-5" />
            </button>

            {onTool && tool ? (
              <>
                <Link
                  href="/"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 sm:px-3 sm:text-xs"
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline">All tools</span>
                  <span className="sm:hidden">Catalog</span>
                </Link>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tool.slug}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate font-mono text-[11px] text-zinc-500 sm:text-xs">
                      <span className="text-zinc-400">{CATEGORY_LABELS[tool.category]}</span>
                      <span className="mx-1.5 text-zinc-600">›</span>
                      <span className="text-zinc-100">{tool.name}</span>
                    </p>
                  </motion.div>
                </AnimatePresence>

                <span
                  className={cn(
                    "hidden shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase sm:inline-flex",
                    tool.cloud
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                  )}
                >
                  {tool.cloud ? "premium" : "local"}
                </span>
              </>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm text-zinc-100">
                  Developer Tools
                  <span className="ml-2 text-zinc-500">· catalog</span>
                </p>
                <p className="hidden font-mono text-[11px] text-zinc-600 sm:block">
                  press <kbd className="rounded border border-zinc-700 px-1 text-zinc-400">/</kbd> to
                  search sidebar
                </p>
              </div>
            )}

            <div className="ml-auto shrink-0">
              <AuthButton />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
