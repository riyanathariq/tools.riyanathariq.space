"use client";

import { ArrowLeft, Crown, LayoutGrid, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AuthButton } from "@/components/auth-button";
import { CommandPalette } from "@/components/command-palette";
import { RecentTabs } from "@/components/recent-tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { VisitorBeacon } from "@/components/visitor-beacon";
import { getToolBySlug } from "@/data/tools-registry";
import { pushRecent } from "@/lib/recent-tools";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/types/tool";

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function RailItem({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-xl transition-colors",
        active
          ? "bg-accent-soft text-accent-ink"
          : "text-ink-muted hover:bg-sunken hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

export function ToolsShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const activeSlug = pathname?.startsWith("/t/") ? pathname.slice(3).split("/")[0] : undefined;
  const tool = activeSlug ? getToolBySlug(activeSlug) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (e.key === "/" && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (tool) pushRecent(tool.slug);
  }, [tool]);

  return (
    <div className="relative flex min-h-dvh bg-surface text-ink">
      <VisitorBeacon />

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[76px] flex-col items-center gap-2 border-r border-line bg-raised py-5 lg:flex">
        <Link
          href="/"
          aria-label="tools.riyanathariq — home"
          className="mb-3 inline-flex size-11 items-center justify-center rounded-[14px] bg-ink font-mono text-[15px] font-semibold text-surface"
        >
          tl
        </Link>
        <RailItem href="/" label="All tools" active={pathname === "/"}>
          <LayoutGrid className="size-5" />
        </RailItem>
        <button
          type="button"
          aria-label="Search tools"
          title="Search tools (⌘K)"
          onClick={() => setPaletteOpen(true)}
          className="inline-flex size-12 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <Search className="size-5" />
        </button>
        <RailItem href="/?c=cloud" label="Premium tools">
          <Crown className="size-5" />
        </RailItem>
        <div className="mt-auto">
          <ThemeToggle />
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col lg:pl-[76px]">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
            <Link
              href="/"
              aria-label="tools.riyanathariq — home"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink font-mono text-sm font-semibold text-surface lg:hidden"
            >
              tl
            </Link>

            {tool ? (
              <>
                <Link
                  href="/"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-accent bg-accent-soft px-2.5 py-1.5 font-mono text-[11px] text-accent-ink transition hover:bg-accent-soft/70 sm:px-3 sm:text-xs"
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline">All tools</span>
                  <span className="sm:hidden">Catalog</span>
                </Link>
                <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-faint sm:text-xs">
                  <span className="text-ink-muted">{CATEGORY_LABELS[tool.category]}</span>
                  <span className="mx-1.5">›</span>
                  <span className="text-ink">{tool.name}</span>
                </p>
                <span
                  className={cn(
                    "hidden shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] uppercase sm:inline-flex",
                    tool.cloud
                      ? "bg-premium-soft text-premium-ink"
                      : "bg-accent-soft text-accent-ink",
                  )}
                >
                  {tool.cloud ? "premium" : "local"}
                </span>
              </>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  Developer Tools
                  <span className="ml-2 font-normal text-ink-faint">· catalog</span>
                </p>
              </div>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Search tools"
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-line-strong px-3 text-sm text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                <Search className="size-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden rounded-md bg-sunken px-1.5 py-0.5 font-mono text-[11px] sm:inline">
                  ⌘K
                </kbd>
              </button>
              <ThemeToggle className="size-9 lg:hidden" />
              <AuthButton />
            </div>
          </div>
          {tool ? <RecentTabs activeSlug={activeSlug} /> : null}
        </header>

        <main className="flex-1 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
