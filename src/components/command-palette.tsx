"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";

import { filterTools, ToolResults } from "@/components/tool-results";

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const tools = useMemo(() => filterTools(query, "all"), [query]);
  const index = Math.min(active, Math.max(tools.length - 1, 0));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(index + 1, tools.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(index - 1, 0));
    } else if (e.key === "Enter" && tools[index]) {
      e.preventDefault();
      router.push(`/t/${tools[index].slug}`);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-raised shadow-pop"
      >
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <Search className="size-5 shrink-0 text-accent" aria-hidden="true" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search tools — jwt, base64, webhook…"
            aria-label="Search tools"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-lg font-medium text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="rounded-lg bg-sunken px-2 py-1 font-mono text-xs text-ink-muted">esc</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {tools.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-muted">
              No tools match <span className="font-mono text-ink">“{query}”</span>.
            </p>
          ) : (
            <ToolResults
              idPrefix="palette"
              tools={tools}
              activeIndex={index}
              onHover={setActive}
              onNavigate={onClose}
              grouped={query.trim() === ""}
            />
          )}
        </div>
        <div className="flex gap-4 border-t border-line px-5 py-3 text-xs font-medium text-ink-muted">
          <span>
            <kbd className="rounded-md bg-sunken px-1.5 py-0.5 font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="rounded-md bg-sunken px-1.5 py-0.5 font-mono">↵</kbd> open
          </span>
        </div>
      </div>
    </div>
  );
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <PaletteDialog onClose={onClose} /> : null;
}
