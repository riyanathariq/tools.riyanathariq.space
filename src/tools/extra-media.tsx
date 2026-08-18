"use client";

import { Download, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClearButton,
  DownloadButton,
  Panel,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";
import { cn, downloadBlob, downloadText } from "@/lib/utils";

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="16" fill="#10b981"/>
  <circle cx="60" cy="60" r="28" fill="#064e3b"/>
  <text x="60" y="66" text-anchor="middle" fill="white" font-size="18" font-family="sans-serif">SVG</text>
</svg>`;

function FileDropzone({
  accept,
  label,
  onText,
  onFile,
}: {
  accept: string;
  label: string;
  onText?: (text: string) => void;
  onFile?: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (onFile) onFile(file);
      if (onText) {
        const reader = new FileReader();
        reader.onload = () => onText(String(reader.result ?? ""));
        reader.readAsText(file);
      }
    },
    [onFile, onText],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors",
        dragOver
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-zinc-700 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900/50",
      )}
    >
      <Upload className="size-7 text-zinc-500" />
      <p className="text-sm text-zinc-300">{label}</p>
      <p className="text-xs text-zinc-500">Drop a file or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

async function svgToPngBlob(svgText: string, size: number): Promise<Blob> {
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to render SVG"));
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, size, size);
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!png) throw new Error("PNG conversion failed");
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function svgConverter() {
  const meta = getToolBySlug("svg-converter");
  const [svg, setSvg] = useState("");
  const [pngSize, setPngSize] = useState(512);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!svg.trim()) {
      setPreviewUrl(null);
      setError(null);
      return;
    }
    if (!svg.includes("<svg")) {
      setPreviewUrl(null);
      setError("Input does not look like SVG markup");
      return;
    }
    setError(null);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [svg]);

  const downloadSvg = useCallback(() => {
    if (!svg.trim()) return;
    downloadText("image.svg", svg, "image/svg+xml");
  }, [svg]);

  const downloadPng = useCallback(async () => {
    if (!svg.trim()) return;
    setConverting(true);
    setError(null);
    try {
      const png = await svgToPngBlob(svg, Math.min(4096, Math.max(16, pngSize)));
      downloadBlob(`image-${pngSize}.png`, png);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PNG conversion failed");
    } finally {
      setConverting(false);
    }
  }, [svg, pngSize]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "SVG Converter"}
        description={meta?.description ?? "Preview SVG and export as PNG."}
        slug="svg-converter"
      />
      <div className="flex flex-col gap-3">
        <FileDropzone
          accept=".svg,image/svg+xml,text/plain"
          label="Upload SVG"
          onText={setSvg}
        />

        <Panel
          title="SVG source"
          actions={
            svg ? (
              <>
                <ClearButton onClick={() => setSvg("")} />
                <DownloadButton value={svg} filename="image.svg" />
              </>
            ) : undefined
          }
        >
          <Textarea
            value={svg}
            onChange={(e) => setSvg(e.target.value)}
            placeholder="Paste SVG markup…"
            className="min-h-[8rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
          />
          {!svg ? (
            <Button type="button" variant="outline" className="mt-2" onClick={() => setSvg(SAMPLE_SVG)}>
              Load sample SVG
            </Button>
          ) : null}
        </Panel>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <label className="text-sm text-zinc-400">
            PNG size (px)
            <Input
              type="number"
              min={16}
              max={4096}
              value={pngSize}
              onChange={(e) => setPngSize(Number(e.target.value) || 512)}
              className="ml-2 inline-block w-24"
            />
          </label>
          <Button type="button" onClick={downloadSvg} disabled={!svg.trim()}>
            <Download className="size-4" />
            Download SVG
          </Button>
          <Button type="button" onClick={downloadPng} disabled={!svg.trim() || converting}>
            <Download className="size-4" />
            {converting ? "Converting…" : "Download PNG"}
          </Button>
        </div>

        <Panel title="Preview">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="SVG preview"
              className="max-h-64 max-w-full rounded-xl border border-zinc-800 bg-white/5 p-4"
            />
          ) : (
            <p className="text-sm text-zinc-500">SVG preview appears here</p>
          )}
        </Panel>
      </div>
    </>
  );
}

