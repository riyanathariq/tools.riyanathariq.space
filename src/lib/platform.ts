import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Label for the search shortcut: ⌘K on Apple devices, Ctrl K elsewhere. */
export function useSearchShortcut(): string {
  return useSyncExternalStore(
    subscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => "⌘K",
  );
}
