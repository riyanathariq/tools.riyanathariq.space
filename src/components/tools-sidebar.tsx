"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cloud, Search, X } from "lucide-react";

import { searchTools } from "@/data/tools-registry";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type ToolCategory } from "@/types/tool";
import { Input } from "@/components/ui/input";

const categoryOrder: ToolCategory[] = [
  "cloud",
  "encoding",
  "crypto",
  "ids",
  "data",
  "http",
  "media",
  "misc",
];

export function ToolsSidebar({
  activeSlug,
  open: _open,
  onClose,
}: {
  activeSlug?: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  void _open;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const grouped = useMemo(() => {
    const list = searchTools(query);
    return categoryOrder
      .map((category) => ({
        category,
        tools: list.filter((t) => t.category === category),
      }))
      .filter((g) => g.tools.length > 0);
  }, [query]);

  return (
    <aside
      className={cn(
        "flex h-full w-[min(100vw,20rem)] flex-col border-r border-zinc-800/80 bg-zinc-950",
        "lg:w-72",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-4 py-4">
        <Link href="/" className="group min-w-0" onClick={onClose}>
          <p className="truncate text-sm font-semibold tracking-tight text-zinc-50">
            tools<span className="text-emerald-400">.riyanathariq</span>
          </p>
        </Link>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="border-b border-zinc-800/80 p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools… (/)"
            className="pl-9"
            aria-label="Search tools"
          />
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {grouped.map((group) => (
          <div key={group.category} className="mb-4">
            <p className="px-2 pb-1.5 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
              {CATEGORY_LABELS[group.category]}
            </p>
            <ul className="space-y-0.5">
              {group.tools.map((tool) => {
                const active = tool.slug === activeSlug;
                return (
                  <li key={tool.slug}>
                    <Link
                      href={`/t/${tool.slug}`}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{tool.name}</span>
                      {tool.cloud ? <Cloud className="size-3.5 shrink-0 opacity-70" aria-label="Premium tool" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {grouped.length === 0 ? (
          <p className="px-3 py-6 text-sm text-zinc-500">No tools match “{query}”.</p>
        ) : null}
      </nav>

      <div className="space-y-1.5 border-t border-zinc-800/80 p-3 text-xs text-zinc-500">
        <a
          href="https://riyanathariq.space"
          className="block hover:text-emerald-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          riyanathariq.space
        </a>
        {siteConfig.saweriaUrl ? (
          <a
            href={siteConfig.saweriaUrl}
            className="block hover:text-emerald-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            Support via Saweria
          </a>
        ) : null}
      </div>
    </aside>
  );
}
