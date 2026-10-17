"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";

import { ToolGlyph } from "@/components/tool-glyph";
import { categoryOrder, filterTools, ToolResults } from "@/components/tool-results";
import { getToolBySlug, toolsRegistry } from "@/data/tools-registry";
import { useRecentTools } from "@/lib/recent-tools";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type ToolCategory } from "@/types/tool";

function isCategory(value: string | null): value is ToolCategory {
  return value !== null && (categoryOrder as string[]).includes(value);
}

export function HomePageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const rawCat = params.get("c");
  const category: ToolCategory | "all" = isCategory(rawCat) ? rawCat : "all";

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const tools = useMemo(() => filterTools(query, category), [query, category]);
  const index = Math.min(active, Math.max(tools.length - 1, 0));
  const filtered = query.trim() !== "" || category !== "all";

  const recent = useRecentTools()
    .map((slug) => getToolBySlug(slug))
    .flatMap((t) => (t ? [t] : []))
    .slice(0, 8);
  const premium = toolsRegistry.filter((t) => t.cloud);

  const selectCategory = (next: ToolCategory | "all") => {
    router.replace(next === "all" ? "/" : `/?c=${next}`, { scroll: false });
    setActive(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(index + 1, tools.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(index - 1, 0));
    } else if (e.key === "Enter" && tools[index]) {
      e.preventDefault();
      router.push(`/t/${tools[index].slug}`);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-accent uppercase">
          tools.riyanathariq.space
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Developer Tools
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          Free online utilities for encoding, crypto, JSON, regex, IDs, and more. Most tools run
          entirely in your browser. Premium tools need sign-in.
        </p>
        <p className="mt-2 font-mono text-xs text-ink-faint">
          {tools.length}/{toolsRegistry.length} utilities{filtered ? " matched" : " online"}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-label="Find a tool"
          className="min-w-0 flex-[1_1_34rem] overflow-hidden rounded-3xl border border-line bg-raised shadow-pop"
        >
          <div className="flex h-[4.5rem] items-center gap-3.5 border-b border-line px-6">
            <Search className="size-5 shrink-0 text-accent" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search tools — jwt, base64, webhook…"
              aria-label="Search tools"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-lg font-medium text-ink outline-none placeholder:text-ink-faint"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActive(0);
                }}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-ink"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-line px-6 py-3">
            {(["all", ...categoryOrder] as const).map((c) => {
              const on = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => selectCategory(c)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
                    on
                      ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                      : "border-line-strong text-ink-muted hover:bg-sunken hover:text-ink",
                  )}
                >
                  {c === "all" ? "all" : CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>

          {tools.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-ink-muted">
              No tools match <span className="font-mono text-ink">“{query}”</span>
              {category !== "all" ? (
                <>
                  {" "}
                  in <span className="text-ink">{CATEGORY_LABELS[category]}</span>
                </>
              ) : null}
              . Try another keyword or clear filters.
            </p>
          ) : (
            <ToolResults
              idPrefix="home"
              tools={tools}
              activeIndex={index}
              onHover={setActive}
              grouped={query.trim() === ""}
            />
          )}

          <div className="hidden gap-5 border-t border-line px-6 py-3 text-xs font-medium text-ink-muted sm:flex">
            <span>
              <kbd className="rounded-md bg-sunken px-1.5 py-0.5 font-mono">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded-md bg-sunken px-1.5 py-0.5 font-mono">↵</kbd> open
            </span>
            <span>
              <kbd className="rounded-md bg-sunken px-1.5 py-0.5 font-mono">/</kbd> search anywhere
            </span>
          </div>
        </section>

        <aside className="flex min-w-0 flex-[1_1_18rem] flex-col gap-5 lg:sticky lg:top-[4.5rem] lg:max-w-sm">
          <section className="rounded-2xl border border-line bg-raised p-5">
            <h2 className="mb-3.5 font-mono text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
              Recent
            </h2>
            {recent.length === 0 ? (
              <p className="text-sm text-ink-muted">Tools you open show up here.</p>
            ) : (
              <ul className="grid grid-cols-4 gap-2">
                {recent.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/t/${t.slug}`}
                      className="flex flex-col items-center gap-2 rounded-xl px-1 py-3 text-center text-xs font-medium text-ink transition-colors hover:bg-sunken"
                    >
                      <ToolGlyph slug={t.slug} name={t.name} premium={t.cloud} className="size-12" />
                      <span className="line-clamp-2">{t.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-raised p-5">
            <h2 className="mb-3.5 font-mono text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
              Premium
            </h2>
            <ul className="grid grid-cols-2 gap-2">
              {premium.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/t/${t.slug}`}
                    className="flex flex-col items-center gap-2 rounded-xl px-1 py-3 text-center text-xs font-medium text-ink transition-colors hover:bg-sunken"
                  >
                    <ToolGlyph slug={t.slug} name={t.name} premium className="size-12" />
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Runs on the Go API backend. Sign in with Google to use them.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
