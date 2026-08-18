"use client";

import QRCode from "qrcode";
import { Download, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClearButton,
  CopyButton,
  Panel,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";
import { cn, downloadBlob } from "@/lib/utils";

function ImageDropzone({
  onFile,
  hasFile,
}: {
  onFile: (file: File) => void;
  hasFile: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = useCallback(
    (file: File | null | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      onFile(file);
    },
    [onFile],
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
        pick(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors",
        dragOver
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-zinc-700 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900/50",
      )}
    >
      <Upload className="size-8 text-zinc-500" />
      <p className="text-sm text-zinc-300">{hasFile ? "Replace image" : "Upload Image"}</p>
      <p className="text-xs text-zinc-500">Drop an image here or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}

const FAVICON_SIZES = [16, 32, 48, 180] as const;

async function imageToPngBlob(src: string, size: number): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
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
}

type ImageTab = "convert" | "favicon";

export function imageConverter() {
  const meta = getToolBySlug("image-converter");
  const [tab, setTab] = useState<ImageTab>("convert");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/png");
  const [quality, setQuality] = useState(0.92);
  const [maxWidth, setMaxWidth] = useState(1200);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Partial<Record<(typeof FAVICON_SIZES)[number], string>>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  const onFile = useCallback((file: File) => {
    setError(null);
    setFileName(file.name);
    setGenerated((prev) => {
      for (const url of Object.values(prev)) {
        if (url) URL.revokeObjectURL(url);
      }
      return {};
    });
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.onerror = () => setError("Failed to read file");
    reader.readAsDataURL(file);
  }, []);

  const clear = useCallback(() => {
    setPreview(null);
    setFileName(null);
    setError(null);
    setGenerated((prev) => {
      for (const url of Object.values(prev)) {
        if (url) URL.revokeObjectURL(url);
      }
      return {};
    });
  }, []);

  useEffect(() => {
    return () => {
      for (const url of Object.values(generated)) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, [generated]);

  const convert = useCallback(async () => {
    if (!preview) return;
    const img = new Image();
    img.src = preview;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });
    let w = img.width;
    let h = img.height;
    if (w > maxWidth) {
      h = Math.round((h * maxWidth) / w);
      w = maxWidth;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (blob) downloadBlob(`converted.${format.split("/")[1]}`, blob);
      },
      format,
      quality,
    );
  }, [preview, format, quality, maxWidth]);

  const generateFavicons = useCallback(async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const next: Partial<Record<(typeof FAVICON_SIZES)[number], string>> = {};
      for (const size of FAVICON_SIZES) {
        const blob = await imageToPngBlob(preview, size);
        next[size] = URL.createObjectURL(blob);
      }
      setGenerated((prev) => {
        for (const url of Object.values(prev)) {
          if (url) URL.revokeObjectURL(url);
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Favicon generation failed");
    } finally {
      setLoading(false);
    }
  }, [preview]);

  const downloadOne = useCallback(
    async (size: (typeof FAVICON_SIZES)[number]) => {
      if (!preview) return;
      const blob = await imageToPngBlob(preview, size);
      downloadBlob(`favicon-${size}x${size}.png`, blob);
    },
    [preview],
  );

  const downloadAll = useCallback(async () => {
    if (!preview) return;
    setLoading(true);
    try {
      for (const size of FAVICON_SIZES) {
        const blob = await imageToPngBlob(preview, size);
        downloadBlob(`favicon-${size}x${size}.png`, blob);
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }, [preview]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Image Converter"}
        description={meta?.description ?? "Convert, resize, or generate favicon PNGs in your browser."}
        slug="image-converter"
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["convert", "Convert"],
            ["favicon", "Favicon"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={tab === key ? "primary" : "outline"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <ImageDropzone onFile={onFile} hasFile={!!preview} />

        {preview && tab === "convert" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-sm text-zinc-300">
                <span className="text-zinc-500">File: </span>
                {fileName}
              </p>
              <ClearButton onClick={clear} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["image/png", "image/jpeg", "image/webp"] as const).map((f) => (
                <Button key={f} type="button" variant={format === f ? "primary" : "outline"} onClick={() => setFormat(f)}>
                  {f.split("/")[1].toUpperCase()}
                </Button>
              ))}
              <label className="text-sm text-zinc-400">
                Quality
                <Input type="number" min={0.1} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="ml-2 inline-block w-20" />
              </label>
              <label className="text-sm text-zinc-400">
                Max width
                <Input type="number" min={100} max={4000} value={maxWidth} onChange={(e) => setMaxWidth(Number(e.target.value))} className="ml-2 inline-block w-24" />
              </label>
              <Button type="button" onClick={convert}>
                <Download className="size-4" />
                Download converted
              </Button>
            </div>

            <Panel title="Preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="max-h-48 max-w-full rounded-xl border border-zinc-800" />
            </Panel>
          </div>
        ) : null}

        {preview && tab === "favicon" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-sm text-zinc-300">
                <span className="text-zinc-500">File: </span>
                {fileName}
              </p>
              <ClearButton onClick={clear} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={generateFavicons} disabled={loading}>
                {loading ? "Generating…" : "Generate previews"}
              </Button>
              <Button type="button" variant="outline" onClick={downloadAll} disabled={loading}>
                <Download className="size-4" />
                Download all sizes
              </Button>
            </div>

            <Panel title="Source preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Source" className="max-h-32 max-w-full rounded-xl border border-zinc-800" />
            </Panel>

            <Panel title="Favicon sizes">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FAVICON_SIZES.map((size) => (
                  <div
                    key={size}
                    className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
                  >
                    <p className="text-xs text-zinc-500">
                      {size}×{size}
                    </p>
                    {generated[size] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={generated[size]}
                        alt={`${size}x${size}`}
                        width={size}
                        height={size}
                        className="rounded bg-white"
                        style={{ width: Math.min(size, 64), height: Math.min(size, 64) }}
                      />
                    ) : (
                      <div className="flex size-12 items-center justify-center text-xs text-zinc-600">—</div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 min-h-9 px-2.5 text-xs"
                      onClick={() => downloadOne(size)}
                      disabled={!preview}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </>
  );
}

type EccLevel = "L" | "M" | "Q" | "H";

export function qrCode() {
  const meta = getToolBySlug("qr-code");
  const [text, setText] = useState("https://riyanathariq.space");
  const [size, setSize] = useState(280);
  const [ecc, setEcc] = useState<EccLevel>("M");
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!text.trim()) {
      setDataUrl("");
      return;
    }
    QRCode.toDataURL(text, { margin: 2, width: size, errorCorrectionLevel: ecc })
      .then(setDataUrl)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "QR generation failed");
        setDataUrl("");
      });
  }, [text, size, ecc]);

  const downloadQr = useCallback(() => {
    if (!dataUrl) return;
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) => downloadBlob("qrcode.png", blob));
  }, [dataUrl]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "QR Code"}
        description={meta?.description ?? "Generate QR codes from text or URLs."}
        slug="qr-code"
      />
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <label className="text-sm text-zinc-400">
          Size
          <Input type="number" min={128} max={1024} step={8} value={size} onChange={(e) => setSize(Number(e.target.value))} className="ml-2 inline-block w-24" />
        </label>
        <span className="text-sm text-zinc-500">ECC</span>
        {(["L", "M", "Q", "H"] as const).map((level) => (
          <Button key={level} type="button" variant={ecc === level ? "primary" : "outline"} onClick={() => setEcc(level)}>
            {level}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Text / URL">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[8rem] border-0 bg-zinc-950 p-0 focus:ring-0" />
        </Panel>
        <Panel
          title="QR Code"
          actions={
            dataUrl ? (
              <Button type="button" variant="ghost" className="h-9 min-h-9 px-2.5" onClick={downloadQr}>
                <Download className="size-4" />
                <span className="sr-only sm:not-sr-only sm:inline">Download</span>
              </Button>
            ) : undefined
          }
        >
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR code" className="mx-auto rounded-xl bg-white p-3" />
          ) : (
            <p className="text-sm text-zinc-500">Enter text to generate QR code</p>
          )}
        </Panel>
      </div>
    </>
  );
}
