"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TOOLS_PREVIEW_OPTIONS } from "./options";

export function ToolsPreviewBar() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
        <Link href="/preview" className="mr-2 font-mono text-[11px] tracking-wider text-zinc-500 uppercase hover:text-white">
          Tools previews
        </Link>
        {TOOLS_PREVIEW_OPTIONS.map((opt) => {
          const active = pathname === opt.href;
          return (
            <Link
              key={opt.id}
              href={opt.href}
              className={`rounded-full px-3 py-1 text-xs transition ${
                active ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {opt.name}
            </Link>
          );
        })}
        <Link href="/" className="ml-auto text-xs text-zinc-500 hover:text-zinc-300">
          Live home →
        </Link>
      </div>
    </div>
  );
}
