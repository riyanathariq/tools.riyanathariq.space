"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClearButton,
  CopyButton,
  DownloadButton,
  Panel,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";
import { FIGLET_FONTS, renderFiglet, type FigletFontName } from "@/lib/figlet-fonts";

type UnitDef = { key: string; label: string; toBase: number; hintApprox?: boolean };

const TIME_UNITS: UnitDef[] = [
  { key: "ns", label: "Nanoseconds", toBase: 1e-9 },
  { key: "us", label: "Microseconds", toBase: 1e-6 },
  { key: "ms", label: "Milliseconds", toBase: 1e-3 },
  { key: "s", label: "Seconds", toBase: 1 },
  { key: "min", label: "Minutes", toBase: 60 },
  { key: "h", label: "Hours", toBase: 3600 },
  { key: "d", label: "Days", toBase: 86400 },
  { key: "wk", label: "Weeks", toBase: 604800 },
  { key: "mo", label: "Months (avg)", toBase: 2629746, hintApprox: true },
  { key: "yr", label: "Years (avg)", toBase: 31556952, hintApprox: true },
];

const DATA_UNITS: UnitDef[] = [
  { key: "b", label: "Bits", toBase: 1 / 8 },
  { key: "B", label: "Bytes", toBase: 1 },
  { key: "KB", label: "Kilobytes (10³)", toBase: 1e3 },
  { key: "KiB", label: "Kibibytes (2¹⁰)", toBase: 1024 },
  { key: "MB", label: "Megabytes (10⁶)", toBase: 1e6 },
  { key: "MiB", label: "Mebibytes (2²⁰)", toBase: 1024 ** 2 },
  { key: "GB", label: "Gigabytes (10⁹)", toBase: 1e9 },
  { key: "GiB", label: "Gibibytes (2³⁰)", toBase: 1024 ** 3 },
  { key: "TB", label: "Terabytes (10¹²)", toBase: 1e12 },
  { key: "TiB", label: "Tebibytes (2⁴⁰)", toBase: 1024 ** 4 },
];

const RATE_UNITS: UnitDef[] = [
  { key: "bps", label: "bit/s", toBase: 1 },
  { key: "Kbps", label: "Kbit/s", toBase: 1e3 },
  { key: "Mbps", label: "Mbit/s", toBase: 1e6 },
  { key: "Gbps", label: "Gbit/s", toBase: 1e9 },
  { key: "Bps", label: "Byte/s", toBase: 8 },
  { key: "KBps", label: "KB/s", toBase: 8e3 },
  { key: "MBps", label: "MB/s", toBase: 8e6 },
  { key: "GBps", label: "GB/s", toBase: 8e9 },
];

const LENGTH_UNITS: UnitDef[] = [
  { key: "mm", label: "Millimeters", toBase: 0.001 },
  { key: "cm", label: "Centimeters", toBase: 0.01 },
  { key: "m", label: "Meters", toBase: 1 },
  { key: "km", label: "Kilometers", toBase: 1000 },
  { key: "in", label: "Inches", toBase: 0.0254 },
  { key: "ft", label: "Feet", toBase: 0.3048 },
  { key: "yd", label: "Yards", toBase: 0.9144 },
  { key: "mi", label: "Miles", toBase: 1609.344 },
];

const WEIGHT_UNITS: UnitDef[] = [
  { key: "mg", label: "Milligrams", toBase: 0.000001 },
  { key: "g", label: "Grams", toBase: 0.001 },
  { key: "kg", label: "Kilograms", toBase: 1 },
  { key: "t", label: "Metric tons", toBase: 1000 },
  { key: "oz", label: "Ounces", toBase: 0.028349523125 },
  { key: "lb", label: "Pounds", toBase: 0.45359237 },
];

type Category = "time" | "data" | "rate" | "length" | "weight" | "temp" | "base";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "time", label: "Time" },
  { id: "data", label: "Data Size" },
  { id: "rate", label: "Transfer Rate" },
  { id: "length", label: "Length" },
  { id: "weight", label: "Weight" },
  { id: "temp", label: "Temperature" },
  { id: "base", label: "Base" },
];

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Object.is(n, -0)) return "0";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return n.toExponential(6);
  return String(Number(n.toPrecision(12)));
}

function humanizeSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function toCelsius(v: number, unit: "C" | "F" | "K") {
  if (unit === "C") return v;
  if (unit === "F") return ((v - 32) * 5) / 9;
  return v - 273.15;
}

function fromCelsius(c: number, unit: "C" | "F" | "K") {
  if (unit === "C") return c;
  if (unit === "F") return (c * 9) / 5 + 32;
  return c + 273.15;
}

function LinkedUnitFields({
  units,
  baseValue,
  onBaseChange,
  hintFor,
}: {
  units: UnitDef[];
  baseValue: number;
  onBaseChange: (base: number) => void;
  hintFor?: (unitKey: string, value: number, base: number) => string | null;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {units.map((u) => {
        const display = active === u.key ? draft : formatNum(baseValue / u.toBase);
        const hint = hintFor?.(u.key, Number(display), baseValue) ?? null;
        return (
          <label
            key={u.key}
            className={`flex flex-col gap-1 rounded-xl border px-3 py-2 ${
              active === u.key ? "border-emerald-500/50 bg-zinc-900" : "border-zinc-800 bg-zinc-950"
            }`}
          >
            <span className="flex items-center justify-between gap-2 text-xs text-zinc-500">
              <span>
                {u.label}
                {u.hintApprox ? " *" : ""}
              </span>
              <span className="font-mono text-zinc-600">{u.key}</span>
            </span>
            <Input
              value={display}
              onFocus={() => {
                setActive(u.key);
                setDraft(formatNum(baseValue / u.toBase));
              }}
              onBlur={() => setActive(null)}
              onChange={(e) => {
                const raw = e.target.value;
                setDraft(raw);
                const n = Number(raw);
                if (!Number.isNaN(n)) onBaseChange(n * u.toBase);
              }}
              className="h-10"
            />
            {hint ? <span className="text-[11px] text-zinc-500">{hint}</span> : null}
          </label>
        );
      })}
    </div>
  );
}

export function unitsConverter() {
  const meta = getToolBySlug("units-converter");
  const [category, setCategory] = useState<Category>("time");
  const [base, setBase] = useState(1);

  const [bin, setBin] = useState("1");
  const [oct, setOct] = useState("1");
  const [dec, setDec] = useState("1");
  const [hex, setHex] = useState("1");
  const [baseError, setBaseError] = useState<string | null>(null);

  const syncFromDec = useCallback((n: bigint) => {
    setDec(n.toString(10));
    setBin(n.toString(2));
    setOct(n.toString(8));
    setHex(n.toString(16).toUpperCase());
    setBaseError(null);
  }, []);

  useEffect(() => {
    if (category === "base") syncFromDec(BigInt(1));
    else if (category === "time") setBase(1);
    else if (category === "data") setBase(1024);
    else if (category === "rate") setBase(1_000_000);
    else if (category === "length") setBase(1);
    else if (category === "weight") setBase(1);
    else if (category === "temp") setBase(0);
  }, [category, syncFromDec]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Units Converter"}
        description={meta?.description ?? ""}
        slug="units-converter"
      />
      <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        {CATEGORIES.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant={category === c.id ? "primary" : "outline"}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {category === "time" ? (
        <div className="space-y-3">
          <LinkedUnitFields
            units={TIME_UNITS}
            baseValue={base}
            onBaseChange={setBase}
            hintFor={(key, _v, b) =>
              key === "d" || key === "h" || key === "min" ? humanizeSeconds(b) : null
            }
          />
          <p className="text-xs text-zinc-500">
            * Months/Years use average Gregorian lengths (~30.44d / ~365.24d), not calendar months.
          </p>
        </div>
      ) : null}

      {category === "data" ? (
        <LinkedUnitFields units={DATA_UNITS} baseValue={base} onBaseChange={setBase} />
      ) : null}

      {category === "rate" ? (
        <LinkedUnitFields units={RATE_UNITS} baseValue={base} onBaseChange={setBase} />
      ) : null}

      {category === "length" ? (
        <LinkedUnitFields units={LENGTH_UNITS} baseValue={base} onBaseChange={setBase} />
      ) : null}

      {category === "weight" ? (
        <LinkedUnitFields units={WEIGHT_UNITS} baseValue={base} onBaseChange={setBase} />
      ) : null}

      {category === "temp" ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {(["C", "F", "K"] as const).map((u) => (
            <label
              key={u}
              className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
            >
              <span className="text-xs text-zinc-500">
                {u === "C" ? "Celsius" : u === "F" ? "Fahrenheit" : "Kelvin"}
              </span>
              <Input
                value={formatNum(fromCelsius(base, u))}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) setBase(toCelsius(n, u));
                }}
              />
            </label>
          ))}
        </div>
      ) : null}

      {category === "base" ? (
        <div className="space-y-3">
          {baseError ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {baseError}
            </p>
          ) : null}
          {(
            [
              { label: "Binary (2)", value: bin, set: setBin, radix: 2 as const },
              { label: "Octal (8)", value: oct, set: setOct, radix: 8 as const },
              { label: "Decimal (10)", value: dec, set: setDec, radix: 10 as const },
              { label: "Hexadecimal (16)", value: hex, set: setHex, radix: 16 as const },
            ]
          ).map((row) => (
            <label
              key={row.label}
              className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
            >
              <span className="text-xs text-zinc-500">{row.label}</span>
              <Input
                value={row.value}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  row.set(e.target.value);
                  if (!raw) return;
                  try {
                    let parsed: bigint;
                    if (row.radix === 10) parsed = BigInt(raw);
                    else if (row.radix === 16) parsed = BigInt(`0x${raw}`);
                    else if (row.radix === 8) parsed = BigInt(`0o${raw}`);
                    else parsed = BigInt(`0b${raw}`);
                    syncFromDec(parsed);
                  } catch {
                    setBaseError(`Invalid ${row.label} value`);
                  }
                }}
                className="font-mono"
              />
            </label>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function asciiArt() {
  const meta = getToolBySlug("ascii-art");
  const [input, setInput] = useState("HELLO");
  const [font, setFont] = useState<FigletFontName>("Standard");
  const output = useMemo(() => renderFiglet(input, font), [input, font]);
  const preview = useMemo(() => renderFiglet("Aa", font), [font]);

  return (
    <>
      <ToolHeader name={meta?.name ?? "ASCII Art"} description={meta?.description ?? ""} slug="ascii-art" />
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          Font
          <select
            value={font}
            onChange={(e) => setFont(e.target.value as FigletFontName)}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
          >
            {FIGLET_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <ClearButton onClick={() => setInput("")} />
      </div>
      <Panel title="Font preview (Aa)">
        <pre className="overflow-x-auto whitespace-pre font-mono text-[10px] leading-tight text-zinc-400 sm:text-xs">
          {preview}
        </pre>
      </Panel>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Text">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type text…"
            className="min-h-[12rem] border-0 bg-zinc-950 p-0 focus:ring-0"
          />
        </Panel>
        <Panel
          title="ASCII output"
          actions={
            <>
              <CopyButton value={output} />
              <DownloadButton value={output} filename="ascii-art.txt" />
            </>
          }
        >
          <pre className="min-h-[12rem] overflow-auto whitespace-pre font-mono text-[10px] leading-tight text-emerald-300 sm:text-xs">
            {output}
          </pre>
        </Panel>
      </div>
    </>
  );
}

