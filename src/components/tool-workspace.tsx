"use client";

import { Check, Copy, Download, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-2.5">
        <h2 className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
          {title}
        </h2>
        {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
      </header>
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </section>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 min-h-9 px-2.5"
      onClick={async () => {
        await copyText(value);
        setOk(true);
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
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          {options}
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <Panel
          title={inputLabel}
          actions={<ClearButton onClick={onClear} />}
        >
          <Textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Paste input here…"
            className="min-h-[16rem] border-0 bg-transparent p-0 focus:ring-0 lg:min-h-[22rem]"
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
            className="min-h-[16rem] border-0 bg-transparent p-0 focus:ring-0 lg:min-h-[22rem]"
          />
        </Panel>
      </div>
    </div>
  );
}

export function ToolHeader({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
        {name}
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
    </div>
  );
}
