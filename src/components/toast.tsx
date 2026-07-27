"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ToastState = { message: string; visible: boolean };

const ToastContext = createContext<{
  toast: (message: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({ message: "", visible: false });

  const toast = useCallback((message: string) => {
    setState({ message, visible: true });
    window.setTimeout(() => setState((s) => ({ ...s, visible: false })), 1400);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4 transition-all duration-200",
          state.visible
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0",
        )}
      >
        <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/95 px-4 py-2.5 text-sm text-emerald-200 shadow-lg shadow-black/40 backdrop-blur-md">
          {state.message}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
