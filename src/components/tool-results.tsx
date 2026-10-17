"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ToolGlyph } from "@/components/tool-glyph";
import { toolsRegistry } from "@/data/tools-registry";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type ToolCategory, type ToolMeta } from "@/types/tool";

export const categoryOrder: ToolCategory[] = [
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

/** Tools matching the query and category, grouped in catalogue order. */
export function filterTools(query: string, category: ToolCategory | "all"): ToolMeta[] {
  const q = query.trim();
  const list = toolsRegistry.filter(
    (t) => (category === "all" || t.category === category) && matchesQuery(t, q),
  );
  return categoryOrder.flatMap((c) => list.filter((t) => t.category === c));
}

export function ToolResults({
  idPrefix,
  tools,
  activeIndex,
  onHover,
  onNavigate,
  grouped = true,
}: {
  idPrefix: string;
  tools: ToolMeta[];
  activeIndex: number;
  onHover: (index: number) => void;
  onNavigate?: () => void;
  grouped?: boolean;
}) {
  useEffect(() => {
    document
      .getElementById(`${idPrefix}-${tools[activeIndex]?.slug}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [idPrefix, tools, activeIndex]);

  return (
    <ul role="listbox" aria-label="Tools" className="pb-2">
      {tools.map((tool, i) => {
        const showHeader = grouped && tool.category !== tools[i - 1]?.category;
        const active = i === activeIndex;
        return (
          <li key={tool.slug} role="presentation">
            {showHeader ? (
              <p className="px-6 pt-4 pb-1.5 font-mono text-[11px] font-medium tracking-[0.14em] text-ink-faint uppercase">
                {CATEGORY_LABELS[tool.category]}
              </p>
            ) : null}
            <Link
              id={`${idPrefix}-${tool.slug}`}
              role="option"
              aria-selected={active}
              href={`/t/${tool.slug}`}
              onClick={onNavigate}
              onMouseMove={() => {
                if (!active) onHover(i);
              }}
              className={cn(
                "flex items-center gap-3.5 px-6 py-2.5 outline-offset-[-2px] transition-colors",
                active ? "bg-accent-soft" : "hover:bg-sunken",
              )}
            >
              <ToolGlyph slug={tool.slug} name={tool.name} premium={tool.cloud} active={active} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-ink">{tool.name}</span>
                <span className="block truncate text-[13px] text-ink-muted">{tool.description}</span>
              </span>
              {tool.cloud ? (
                <span className="rounded-full bg-premium-soft px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-premium-ink uppercase">
                  premium
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
