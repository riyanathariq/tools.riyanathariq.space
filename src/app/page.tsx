"use client";

import Link from "next/link";

import { ToolsShell } from "@/components/tools-shell";
import { toolsRegistry } from "@/data/tools-registry";
import { CATEGORY_LABELS, type ToolCategory } from "@/types/tool";

const categoryOrder: ToolCategory[] = [
  "encoding",
  "crypto",
  "ids",
  "data",
  "http",
  "media",
  "misc",
];

export default function HomePage() {
  const grouped = categoryOrder.map((category) => ({
    category,
    tools: toolsRegistry.filter((t) => t.category === category),
  }));

  return (
    <ToolsShell title="Developer Tools">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Developer Tools
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          {toolsRegistry.length} utilities for encoding, crypto, data manipulation, and more —
          everything runs in your browser.
        </p>
      </div>

      <div className="space-y-10">
        {grouped.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 text-xs font-medium tracking-[0.14em] text-zinc-500 uppercase">
              {CATEGORY_LABELS[group.category]}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.tools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/t/${tool.slug}`}
                    className="group block rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 transition-colors hover:border-emerald-500/30 hover:bg-zinc-900/70"
                  >
                    <h3 className="font-medium text-zinc-100 group-hover:text-emerald-300">
                      {tool.name}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                      {tool.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ToolsShell>
  );
}
