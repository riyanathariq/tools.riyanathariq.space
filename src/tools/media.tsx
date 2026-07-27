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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace(/^#/, "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function CopyChip({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(value)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-200 transition-colors hover:border-emerald-500/50 hover:bg-zinc-900"
      title={`Copy ${label}`}
    >
      <span className="text-zinc-500">{label}</span>
      {value}
    </button>
  );
}

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

export function imageConverter() {
  const meta = getToolBySlug("image-converter");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/png");
  const [quality, setQuality] = useState(0.92);
  const [maxWidth, setMaxWidth] = useState(1200);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback((file: File) => {
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.onerror = () => setError("Failed to read file");
    reader.readAsDataURL(file);
  }, []);

  const clear = useCallback(() => {
    setPreview(null);
    setFileName(null);
    setError(null);
  }, []);

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

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Image Converter"}
        description={meta?.description ?? "Convert and resize images in your browser."}
        slug="image-converter"
      />
      <div className="flex flex-col gap-3">
        <ImageDropzone onFile={onFile} hasFile={!!preview} />

        {preview ? (
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

export function colorPicker() {
  const meta = getToolBySlug("color-picker");
  const [hex, setHex] = useState("#10b981");
  const [rgb, setRgb] = useState({ r: 16, g: 185, b: 129 });
  const [hsl, setHsl] = useState({ h: 160, s: 84, l: 39 });
  const [error, setError] = useState<string | null>(null);

  const syncFromHex = (value: string) => {
    const parsed = hexToRgb(value);
    if (!parsed) {
      setError("Invalid hex color");
      return;
    }
    setError(null);
    setHex(value.startsWith("#") ? value : `#${value}`);
    setRgb(parsed);
    setHsl(rgbToHsl(parsed.r, parsed.g, parsed.b));
  };

  const syncFromRgb = (r: number, g: number, b: number) => {
    setRgb({ r, g, b });
    setHex(rgbToHex(r, g, b));
    setHsl(rgbToHsl(r, g, b));
    setError(null);
  };

  const syncFromHsl = (h: number, s: number, l: number) => {
    setHsl({ h, s, l });
    const c = hslToRgb(h, s, l);
    setRgb(c);
    setHex(rgbToHex(c.r, c.g, c.b));
    setError(null);
  };

  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Color Picker"}
        description={meta?.description ?? "Convert between HEX, RGB, and HSL."}
        slug="color-picker"
      />
      <div className="flex flex-col gap-3">
        <div
          className="h-24 rounded-2xl border border-zinc-800 bg-zinc-950"
          style={{ backgroundColor: hex }}
        />
        <div className="flex flex-wrap gap-2">
          <CopyChip label="HEX" value={hex} />
          <CopyChip label="RGB" value={rgbStr} />
          <CopyChip label="HSL" value={hslStr} />
        </div>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <Panel title="HEX">
            <div className="flex items-center gap-2">
              <Input value={hex} onChange={(e) => syncFromHex(e.target.value)} className="font-mono" />
              <CopyButton value={hex} />
            </div>
          </Panel>
          <Panel title="RGB">
            <div className="flex gap-2">
              {(["r", "g", "b"] as const).map((k) => (
                <Input
                  key={k}
                  type="number"
                  min={0}
                  max={255}
                  value={rgb[k]}
                  onChange={(e) => syncFromRgb(k === "r" ? Number(e.target.value) : rgb.r, k === "g" ? Number(e.target.value) : rgb.g, k === "b" ? Number(e.target.value) : rgb.b)}
                  className="w-full font-mono"
                />
              ))}
            </div>
          </Panel>
          <Panel title="HSL">
            <div className="flex gap-2">
              <Input type="number" min={0} max={360} value={hsl.h} onChange={(e) => syncFromHsl(Number(e.target.value), hsl.s, hsl.l)} />
              <Input type="number" min={0} max={100} value={hsl.s} onChange={(e) => syncFromHsl(hsl.h, Number(e.target.value), hsl.l)} />
              <Input type="number" min={0} max={100} value={hsl.l} onChange={(e) => syncFromHsl(hsl.h, hsl.s, Number(e.target.value))} />
            </div>
          </Panel>
        </div>
        <input type="color" value={hex} onChange={(e) => syncFromHex(e.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950" />
      </div>
    </>
  );
}
