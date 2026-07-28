"use client";

import { Copy, Pipette, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton, Panel, ToolHeader } from "@/components/tool-workspace";
import { useToast } from "@/components/toast";
import { getToolBySlug } from "@/data/tools-registry";
import { copyText } from "@/lib/utils";

type Rgba = { r: number; g: number; b: number; a: number };
type Hsv = { h: number; s: number; v: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function rgbToHsv(r: number, g: number, b: number): Hsv {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return {
    h: h * 360,
    s: max === 0 ? 0 : d / max,
    v: max,
  };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1);
  v = clamp(v, 0, 1);
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function parseHex(input: string): Rgba | null {
  const raw = input.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(raw)) return null;
  let h = raw;
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const hasAlpha = h.length === 8;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: hasAlpha ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}

function toHex2(n: number) {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0").toUpperCase();
}

function rgbaToHex6(c: Rgba) {
  return `#${toHex2(c.r)}${toHex2(c.g)}${toHex2(c.b)}`;
}

function rgbaToHex8(c: Rgba) {
  return `#${toHex2(c.r)}${toHex2(c.g)}${toHex2(c.b)}${toHex2(c.a * 255)}`;
}

function hueCss(h: number) {
  const { r, g, b } = hsvToRgb(h, 1, 1);
  return `rgb(${r}, ${g}, ${b})`;
}

const CHECKER =
  "linear-gradient(45deg, #3f3f46 25%, transparent 25%), linear-gradient(-45deg, #3f3f46 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3f3f46 75%), linear-gradient(-45deg, transparent 75%, #3f3f46 75%)";

function CssRow({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  return (
    <div className="flex items-center gap-2 border-b border-zinc-800/80 py-2 last:border-0">
      <span className="w-14 shrink-0 text-xs font-medium text-zinc-500 uppercase">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-200">{value}</code>
      <Button
        type="button"
        variant="ghost"
        className="h-8 min-h-8 shrink-0 px-2"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          await copyText(value);
          toast("Copied to clipboard");
        }}
      >
        <Copy className="size-4 text-zinc-400" />
        <span className="sr-only">Copy</span>
      </Button>
    </div>
  );
}

function usePointerDrag(
  onMove: (clientX: number, clientY: number) => void,
) {
  const dragging = useRef(false);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      moveRef.current(e.clientX, e.clientY);
    };
    const onPointerUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    moveRef.current(e.clientX, e.clientY);
  }, []);
}

export function colorPicker() {
  const meta = getToolBySlug("color-picker");
  const [color, setColor] = useState<Rgba>({ r: 16, g: 185, b: 129, a: 1 });
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(16, 185, 129));
  const [hexInput, setHexInput] = useState("10B981FF");
  const [eyedropperOk, setEyedropperOk] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sampleLocked, setSampleLocked] = useState(false);
  const [hoverHint, setHoverHint] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setEyedropperOk(typeof window !== "undefined" && "EyeDropper" in window);
  }, []);

  const applyRgb = useCallback((r: number, g: number, b: number, a = color.a, syncHex = true) => {
    const next = {
      r: clamp(Math.round(r), 0, 255),
      g: clamp(Math.round(g), 0, 255),
      b: clamp(Math.round(b), 0, 255),
      a: clamp(a, 0, 1),
    };
    setColor(next);
    setHsv(rgbToHsv(next.r, next.g, next.b));
    if (syncHex) setHexInput(rgbaToHex8(next).slice(1));
  }, [color.a]);

  const applyHsv = useCallback((nextHsv: Hsv, a = color.a) => {
    const rgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
    const next = { ...rgb, a: clamp(a, 0, 1) };
    setHsv(nextHsv);
    setColor(next);
    setHexInput(rgbaToHex8(next).slice(1));
  }, [color.a]);

  const applyFromHex = useCallback((value: string) => {
    setHexInput(value.replace(/^#/, "").toUpperCase());
    const parsed = parseHex(value);
    if (!parsed) return;
    setColor(parsed);
    setHsv(rgbToHsv(parsed.r, parsed.g, parsed.b));
  }, []);

  const onSvMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = clamp((clientX - rect.left) / rect.width, 0, 1);
      const v = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
      applyHsv({ h: hsv.h, s, v });
    },
    [applyHsv, hsv.h],
  );

  const onHueMove = useCallback(
    (clientX: number) => {
      const el = hueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 359.999);
      applyHsv({ h, s: hsv.s, v: hsv.v });
    },
    [applyHsv, hsv.s, hsv.v],
  );

  const onAlphaMove = useCallback(
    (clientX: number) => {
      const el = alphaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const a = clamp((clientX - rect.left) / rect.width, 0, 1);
      applyHsv(hsv, a);
    },
    [applyHsv, hsv],
  );

  const startSv = usePointerDrag(onSvMove);
  const startHue = usePointerDrag((x) => onHueMove(x));
  const startAlpha = usePointerDrag((x) => onAlphaMove(x));

  const pickEyedropper = async () => {
    // @ts-expect-error EyeDropper is Chromium-only
    const dropper = new window.EyeDropper();
    try {
      const result = await dropper.open();
      applyFromHex(result.sRGBHex);
    } catch {
      /* cancelled */
    }
  };

  const loadImage = useCallback((file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setSampleLocked(false);
    setHoverHint("Hover to sample · click to lock");
  }, []);

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const maxW = 720;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const sampleLockedRef = useRef(false);
  sampleLockedRef.current = sampleLocked;

  const sampleCanvas = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>, mode: "hover" | "lock" | "force") => {
      if (mode === "hover" && sampleLockedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const px = ctx.getImageData(clamp(x, 0, canvas.width - 1), clamp(y, 0, canvas.height - 1), 1, 1).data;
      applyRgb(px[0], px[1], px[2], px[3] / 255);
      if (mode === "lock") {
        setSampleLocked(true);
        setHoverHint("Locked — click again to resample");
      } else if (mode === "force") {
        setSampleLocked(false);
        setHoverHint("Hover to sample · click to lock");
      }
    },
    [applyRgb],
  );

  const hsl = rgbToHsl(color.r, color.g, color.b);
  const aPct = Math.round(color.a * 100);
  const hex6 = rgbaToHex6(color);
  const hex8 = rgbaToHex8(color);
  const rgbStr = `rgb(${color.r}, ${color.g}, ${color.b})`;
  const rgbaStr = `rgba(${color.r}, ${color.g}, ${color.b}, ${Number(color.a.toFixed(3))})`;
  const hslStr = `hsl(${hsl.h.toFixed(2)}, ${hsl.s.toFixed(2)}%, ${hsl.l.toFixed(2)}%)`;
  const hslaStr = `hsla(${hsl.h.toFixed(2)}, ${hsl.s.toFixed(2)}%, ${hsl.l.toFixed(2)}%, ${Number(color.a.toFixed(3))})`;
  const solid = `rgb(${color.r}, ${color.g}, ${color.b})`;
  const withAlpha = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Color Picker"}
        description={meta?.description ?? "Pick colors with HSV, alpha, CSS outputs, and image sampling."}
        slug="color-picker"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
          {/* SV plane */}
          <div
            ref={svRef}
            onPointerDown={startSv}
            className="relative aspect-[4/3] w-full cursor-crosshair touch-none overflow-hidden rounded-xl border border-zinc-800"
            style={{
              background: `
                linear-gradient(to top, #000, transparent),
                linear-gradient(to right, #fff, ${hueCss(hsv.h)})
              `,
            }}
            role="slider"
            aria-label="Saturation and brightness"
            aria-valuetext={`S ${Math.round(hsv.s * 100)}% V ${Math.round(hsv.v * 100)}%`}
          >
            <span
              className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: solid }}
            />
          </div>

          {/* Eyedropper + preview + sliders */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="size-10 shrink-0 p-0"
              disabled={!eyedropperOk}
              title={eyedropperOk ? "Pick from screen" : "EyeDropper not supported in this browser"}
              onClick={() => void pickEyedropper()}
            >
              <Pipette className="size-4" />
            </Button>
            <div
              className="size-10 shrink-0 overflow-hidden rounded-full border border-zinc-700"
              style={{ backgroundImage: CHECKER, backgroundSize: "8px 8px", backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0" }}
            >
              <div className="size-full" style={{ backgroundColor: withAlpha }} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div
                ref={hueRef}
                onPointerDown={startHue}
                className="relative h-3.5 cursor-ew-resize touch-none rounded-full border border-zinc-800"
                style={{
                  background:
                    "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
                }}
                role="slider"
                aria-label="Hue"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={Math.round(hsv.h)}
              >
                <span
                  className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow"
                  style={{ left: `${(hsv.h / 360) * 100}%` }}
                />
              </div>
              <div
                ref={alphaRef}
                onPointerDown={startAlpha}
                className="relative h-3.5 cursor-ew-resize touch-none overflow-hidden rounded-full border border-zinc-800"
                style={{ backgroundImage: CHECKER, backgroundSize: "8px 8px", backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0" }}
                role="slider"
                aria-label="Alpha"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={aPct}
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `linear-gradient(to right, transparent, ${solid})` }}
                />
                <span
                  className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow"
                  style={{ left: `${color.a * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Channels */}
          <div className="grid grid-cols-5 gap-2">
            {(
              [
                ["R", color.r, (n: number) => applyRgb(n, color.g, color.b), 0, 255],
                ["G", color.g, (n: number) => applyRgb(color.r, n, color.b), 0, 255],
                ["B", color.b, (n: number) => applyRgb(color.r, color.g, n), 0, 255],
                ["A%", aPct, (n: number) => applyRgb(color.r, color.g, color.b, clamp(n, 0, 100) / 100), 0, 100],
              ] as const
            ).map(([label, value, onChange, min, max]) => (
              <label key={label} className="flex flex-col gap-1">
                <span className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">{label}</span>
                <Input
                  type="number"
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => onChange(Number(e.target.value))}
                  className="h-9 px-2 font-mono text-sm"
                />
              </label>
            ))}
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">Hex</span>
              <Input
                value={hexInput}
                onChange={(e) => applyFromHex(e.target.value)}
                className="h-9 px-2 font-mono text-sm uppercase"
                maxLength={8}
              />
            </label>
          </div>

          {/* CSS Colors */}
          <Panel title="CSS Colors" className="flex-none">
            <div className="-my-1">
              <CssRow label="rgb" value={rgbStr} />
              <CssRow label="rgba" value={rgbaStr} />
              <CssRow label="hex" value={hex6} />
              <CssRow label="hex8" value={hex8} />
              <CssRow label="hsl" value={hslStr} />
              <CssRow label="hsla" value={hslaStr} />
            </div>
          </Panel>
        </div>

        {/* Image sampler */}
        <div className="flex flex-col gap-3">
          <Panel
            title="Sample from image"
            actions={
              imageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 min-h-9 px-2.5"
                  onClick={() => {
                    setImageUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return null;
                    });
                    imgRef.current = null;
                    setSampleLocked(false);
                    setHoverHint(null);
                  }}
                >
                  <X className="size-4" />
                  <span className="sr-only sm:not-sr-only sm:inline">Clear</span>
                </Button>
              ) : undefined
            }
          >
            {!imageUrl ? (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  loadImage(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-12 text-center transition-colors hover:border-zinc-500 hover:bg-zinc-900/50"
              >
                <Upload className="size-8 text-zinc-500" />
                <p className="text-sm text-zinc-300">Upload image</p>
                <p className="text-xs text-zinc-500">Hover to preview color · click to lock</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => loadImage(e.target.files?.[0])}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {hoverHint ? <p className="text-xs text-zinc-500">{hoverHint}</p> : null}
                <canvas
                  ref={canvasRef}
                  onPointerMove={(e) => sampleCanvas(e, "hover")}
                  onPointerDown={(e) => sampleCanvas(e, sampleLocked ? "force" : "lock")}
                  className="max-h-[28rem] w-full cursor-crosshair rounded-xl border border-zinc-800 bg-zinc-900 object-contain"
                />
                <div className="flex items-center gap-2">
                  <div
                    className="size-8 overflow-hidden rounded-lg border border-zinc-700"
                    style={{ backgroundImage: CHECKER, backgroundSize: "8px 8px" }}
                  >
                    <div className="size-full" style={{ backgroundColor: withAlpha }} />
                  </div>
                  <code className="font-mono text-sm text-zinc-300">{hex8}</code>
                  <CopyButton value={hex8} />
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
