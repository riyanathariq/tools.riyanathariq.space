"use client";

import { AnimatePresence, motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { toolsRegistry } from "@/data/tools-registry";
import { siteConfig } from "@/lib/site";
import { CATEGORY_LABELS, type ToolCategory, type ToolMeta } from "@/types/tool";

const categoryOrder: ToolCategory[] = [
  "cloud",
  "encoding",
  "crypto",
  "ids",
  "data",
  "http",
  "media",
  "documents",
  "indonesia",
  "misc",
];

function matchesQuery(tool: ToolMeta, q: string) {
  if (!q) return true;
  const hay = [tool.name, tool.description, tool.slug, tool.category, ...tool.keywords]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token));
}

function SpotlightCard({
  tool,
  index,
}: {
  tool: ToolMeta;
  index: number;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const background = useMotionTemplate`radial-gradient(320px circle at ${mx}px ${my}px, rgba(16,185,129,0.18), transparent 55%)`;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index, 10) * 0.03, type: "spring", stiffness: 320, damping: 28 }}
    >
      <Link
        href={`/t/${tool.slug}`}
        className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-4 transition hover:border-emerald-500/40"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set(e.clientX - r.left);
          my.set(e.clientY - r.top);
        }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background }}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              {CATEGORY_LABELS[tool.category]}
            </p>
            {tool.cloud ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
                premium
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 text-base font-medium text-white group-hover:text-emerald-200">
            {tool.name}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{tool.description}</p>
        </div>
      </Link>
    </motion.li>
  );
}

export function HomePageClient() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<ToolCategory | "all">("all");

  const filtered = useMemo(() => {
    return toolsRegistry.filter((t) => {
      if (activeCat !== "all" && t.category !== activeCat) return false;
      return matchesQuery(t, query.trim());
    });
  }, [query, activeCat]);

  const grouped = useMemo(() => {
    return categoryOrder
      .map((category) => ({
        category,
        tools: filtered.filter((t) => t.category === category),
      }))
      .filter((g) => g.tools.length > 0);
  }, [filtered]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative mb-8"
      >
        <p className="font-mono text-[11px] tracking-[0.2em] text-emerald-400/90 uppercase">
          {siteConfig.shortName ?? "tools"} · terminal lab
        </p>
        <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Developer Tools
          <span className="ml-1 inline-block h-[0.85em] w-2 translate-y-0.5 animate-pulse bg-emerald-400 align-baseline" />
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Free online utilities for encoding, crypto, JSON, regex, IDs, and more. Most tools run
          entirely in your browser. Premium tools need sign-in.
        </p>
        <p className="mt-2 font-mono text-xs text-emerald-500/80">
          {filtered.length}/{toolsRegistry.length} utilities
          {query.trim() || activeCat !== "all" ? " matched" : " online"}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, type: "spring", stiffness: 240, damping: 24 }}
        className="relative mb-8 rounded-2xl border border-emerald-500/20 bg-zinc-900/60 p-4"
      >
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 focus-within:border-emerald-500/40">
          <Search className="size-4 shrink-0 text-emerald-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools — jwt, base64, webhook…"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <CategoryChip
            label="all"
            active={activeCat === "all"}
            onClick={() => setActiveCat("all")}
          />
          {categoryOrder.map((c) => (
            <CategoryChip
              key={c}
              label={CATEGORY_LABELS[c]}
              active={activeCat === c}
              onClick={() => setActiveCat(c)}
            />
          ))}
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500"
        >
          No tools match <span className="font-mono text-zinc-300">“{query}”</span>
          {activeCat !== "all" ? (
            <>
              {" "}
              in <span className="text-zinc-300">{CATEGORY_LABELS[activeCat]}</span>
            </>
          ) : null}
          . Try another keyword or clear filters.
        </motion.p>
      ) : (
        <div className="space-y-10">
          {grouped.map((group) => (
            <section key={group.category}>
              <h2 className="mb-3 font-mono text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
                {CATEGORY_LABELS[group.category]}
                <span className="ml-2 text-zinc-600 normal-case tracking-normal">
                  {group.tools.length}
                </span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {group.tools.map((tool, i) => (
                    <SpotlightCard key={tool.slug} tool={tool} index={i} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={
        active
          ? "rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-1 text-[11px] text-emerald-200"
          : "rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
      }
    >
      {label}
    </motion.button>
  );
}
