"use client";

import { Check, Copy, Download, Info, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getToolBySlug } from "@/data/tools-registry";
import { copyText, downloadText, cn } from "@/lib/utils";

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 px-3 py-2.5">
        <h2 className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{title}</h2>
        {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
      </header>
      <div className="min-h-0 flex-1 bg-zinc-950 p-3">{children}</div>
    </section>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 min-h-9 px-2.5"
      onClick={async () => {
        await copyText(value);
        setOk(true);
        toast("Copied to clipboard");
        setTimeout(() => setOk(false), 1200);
      }}
      aria-label="Copy"
    >
      {ok ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
      <span className="sr-only sm:not-sr-only sm:inline">{ok ? "Copied" : "Copy"}</span>
    </Button>
  );
}

export function DownloadButton({
  value,
  filename,
}: {
  value: string;
  filename: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 min-h-9 px-2.5"
      onClick={() => downloadText(filename, value)}
      aria-label="Download"
    >
      <Download className="size-4" />
      <span className="sr-only sm:not-sr-only sm:inline">Download</span>
    </Button>
  );
}

export function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 min-h-9 px-2.5"
      onClick={onClick}
      aria-label="Clear"
    >
      <Trash2 className="size-4" />
      <span className="sr-only sm:not-sr-only sm:inline">Clear</span>
    </Button>
  );
}

export function TextIO({
  input,
  output,
  onInputChange,
  onClear,
  outputFilename = "output.txt",
  inputLabel = "Input",
  outputLabel = "Output",
  error,
  options,
}: {
  input: string;
  output: string;
  onInputChange: (v: string) => void;
  onClear: () => void;
  outputFilename?: string;
  inputLabel?: string;
  outputLabel?: string;
  error?: string | null;
  options?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[28rem] flex-col gap-3">
      {options ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          {options}
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <Panel title={inputLabel} actions={<ClearButton onClick={onClear} />}>
          <Textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Paste input here…"
            className="min-h-[16rem] border-0 bg-zinc-950 p-0 focus:ring-0 lg:min-h-[22rem]"
          />
        </Panel>
        <Panel
          title={outputLabel}
          actions={
            <>
              <CopyButton value={output} />
              <DownloadButton value={output} filename={outputFilename} />
            </>
          }
        >
          <Textarea
            value={output}
            readOnly
            placeholder="Output appears here…"
            className="min-h-[16rem] border-0 bg-zinc-950 p-0 focus:ring-0 lg:min-h-[22rem]"
          />
        </Panel>
      </div>
    </div>
  );
}

export function ToolHeader({
  name,
  description,
  info,
  slug,
}: {
  name: string;
  description: string;
  info?: string;
  slug?: string;
}) {
  const help = info ?? (slug ? getToolBySlug(slug)?.info : undefined);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div className="mb-5" ref={rootRef}>
      <div className="flex items-start gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">{name}</h1>
        {help ? (
          <div className="relative pt-1">
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-emerald-300"
              aria-label="Tool information"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
            >
              <Info className="size-4" />
            </button>
            {open ? (
              <div
                id={panelId}
                role="dialog"
                aria-label={`${name} information`}
                className="absolute top-full left-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-xl shadow-black/40"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">About</p>
                  <button
                    type="button"
                    className="rounded-md p-1 text-zinc-500 hover:text-zinc-200"
                    aria-label="Close information"
                    onClick={() => setOpen(false)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">{help}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-400">{description}</p>
    </div>
  );
}

/** Shared “Try sample” chip for Light enrichment. */
export function SampleButton({
  label = "Try sample",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" onClick={onClick}>
      {label}
    </Button>
  );
}
