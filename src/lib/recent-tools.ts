import { useMemo, useSyncExternalStore } from "react";

const KEY = "tl-recent";
const MAX = 6;
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function write(slugs: string[]) {
  try {
    localStorage.setItem(KEY, slugs.join(","));
  } catch {
    /* storage unavailable: tabs just won't persist */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const parse = (raw: string) => raw.split(",").filter(Boolean);

export function pushRecent(slug: string) {
  const current = parse(read());
  if (current[0] === slug && current.length <= MAX) return;
  write([slug, ...current.filter((s) => s !== slug)].slice(0, MAX));
}

export function removeRecent(slug: string) {
  write(parse(read()).filter((s) => s !== slug));
}

/** Most recently opened tool slugs, newest first. Empty on the server. */
export function useRecentTools(): string[] {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  return useMemo(() => parse(raw), [raw]);
}
