"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ToolGlyph } from "@/components/tool-glyph";
import { getToolBySlug } from "@/data/tools-registry";
import { removeRecent, useRecentTools } from "@/lib/recent-tools";
import { cn } from "@/lib/utils";

export function RecentTabs({ activeSlug }: { activeSlug?: string }) {
  const recent = useRecentTools();
  const router = useRouter();
  const tabs = recent.flatMap((slug) => {
    const tool = getToolBySlug(slug);
    return tool ? [tool] : [];
  });

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Open tools"
      className="flex gap-1 overflow-x-auto px-3 pt-2 sm:px-4"
    >
      {tabs.map((tool) => {
        const active = tool.slug === activeSlug;
        return (
          <div
            key={tool.slug}
            className={cn(
              "flex shrink-0 items-center rounded-t-xl border border-b-0",
              active
                ? "border-line bg-raised text-ink"
                : "border-transparent text-ink-muted hover:bg-sunken hover:text-ink",
            )}
          >
            <Link
              href={`/t/${tool.slug}`}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-2 py-2 pr-1 pl-2.5 text-sm font-medium whitespace-nowrap"
            >
              <ToolGlyph
                slug={tool.slug}
                name={tool.name}
                premium={tool.cloud}
                className="size-6 rounded-lg text-[10px]"
              />
              {tool.name}
            </Link>
            <button
              type="button"
              aria-label={`Close ${tool.name}`}
              className="mr-1.5 inline-flex size-6 items-center justify-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink"
              onClick={() => {
                removeRecent(tool.slug);
                if (active) {
                  const next = tabs.find((t) => t.slug !== tool.slug);
                  router.push(next ? `/t/${next.slug}` : "/");
                }
              }}
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </nav>
  );
}
