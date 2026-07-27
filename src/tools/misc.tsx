"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CopyButton,
  Panel,
  TextIO,
  ToolHeader,
} from "@/components/tool-workspace";

const BANNER: Record<string, string[]> = {
  A: [" AAA ", "A   A", "AAAAA", "A   A", "A   A"],
  B: ["BBBB ", "B   B", "BBBB ", "B   B", "BBBB "],
  C: [" CCC ", "C   C", "C    ", "C   C", " CCC "],
  D: ["DDDD ", "D   D", "D   D", "D   D", "DDDD "],
  E: ["EEEEE", "E    ", "EEE  ", "E    ", "EEEEE"],
  F: ["FFFFF", "F    ", "FFF  ", "F    ", "F    "],
  G: [" GGG ", "G    ", "G  GG", "G   G", " GGG "],
  H: ["H   H", "H   H", "HHHHH", "H   H", "H   H"],
  I: [" III ", "  I  ", "  I  ", "  I  ", " III "],
  J: ["    J", "    J", "    J", "J   J", " JJJ "],
  K: ["K   K", "K  K ", "KKK  ", "K  K ", "K   K"],
  L: ["L    ", "L    ", "L    ", "L    ", "LLLLL"],
  M: ["M   M", "MM MM", "M M M", "M   M", "M   M"],
  N: ["N   N", "NN  N", "N N N", "N  NN", "N   N"],
  O: [" OOO ", "O   O", "O   O", "O   O", " OOO "],
  P: ["PPPP ", "P   P", "PPPP ", "P    ", "P    "],
  Q: [" QQQ ", "Q   Q", "Q   Q", "Q  Q ", " QQ Q"],
  R: ["RRRR ", "R   R", "RRRR ", "R  R ", "R   R"],
  S: [" SSSS", "S    ", " SSS ", "    S", "SSSS "],
  T: ["TTTTT", "  T  ", "  T  ", "  T  ", "  T  "],
  U: ["U   U", "U   U", "U   U", "U   U", " UUU "],
  V: ["V   V", "V   V", "V   V", " V V ", "  V  "],
  W: ["W   W", "W   W", "W W W", "WW WW", "W   W"],
  X: ["X   X", " X X ", "  X  ", " X X ", "X   X"],
  Y: ["Y   Y", " Y Y ", "  Y  ", "  Y  ", "  Y  "],
  Z: ["ZZZZZ", "   Z ", "  Z  ", " Z   ", "ZZZZZ"],
  "0": [" 000 ", "0   0", "0   0", "0   0", " 000 "],
  "1": ["  1  ", " 11  ", "  1  ", "  1  ", "11111"],
  "2": [" 222 ", "2   2", "  2  ", " 2   ", "22222"],
  "3": ["3333 ", "    3", " 333 ", "    3", "3333 "],
  "4": ["4   4", "4   4", "44444", "    4", "    4"],
  "5": ["55555", "5    ", "5555 ", "    5", "5555 "],
  "6": [" 666 ", "6    ", "6666 ", "6   6", " 666 "],
  "7": ["77777", "   7 ", "  7  ", " 7   ", "7    "],
  "8": [" 888 ", "8   8", " 888 ", "8   8", " 888 "],
  "9": [" 999 ", "9   9", " 9999", "    9", " 999 "],
  " ": ["     ", "     ", "     ", "     ", "     "],
};

function renderBanner(text: string): string {
  const upper = text.toUpperCase();
  const rows = ["", "", "", "", ""];
  for (const ch of upper) {
    const glyph = BANNER[ch] ?? [" ??? ", "?   ?", "?   ?", "?   ?", " ??? "];
    for (let i = 0; i < 5; i++) rows[i] += (glyph[i] ?? "     ") + " ";
  }
  return rows.join("\n");
}

const LENGTH_UNITS: Record<string, number> = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 };
const WEIGHT_UNITS: Record<string, number> = { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495 };
const DATA_UNITS: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };

const DUCK_PROMPTS = [
  "What did I expect to happen?",
  "What actually happened?",
  "What changed since it last worked?",
  "What is the smallest test case?",
  "What assumptions am I making?",
];

const STORAGE_KEY = "rubber-duck-notes";

export function unitsConverter() {
  const [category, setCategory] = useState<"length" | "weight" | "temp" | "data">("length");
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("km");

  const units = useMemo(() => {
    switch (category) {
      case "length": return Object.keys(LENGTH_UNITS);
      case "weight": return Object.keys(WEIGHT_UNITS);
      case "temp": return ["C", "F", "K"];
      case "data": return Object.keys(DATA_UNITS);
    }
  }, [category]);

  useEffect(() => {
    setFrom(units[0]);
    setTo(units[1] ?? units[0]);
  }, [category, units]);

  const output = useMemo(() => {
    const v = Number(value);
    if (Number.isNaN(v)) return "Invalid number";
    if (category === "temp") {
      let c = v;
      if (from === "F") c = ((v - 32) * 5) / 9;
      if (from === "K") c = v - 273.15;
      let result = c;
      if (to === "F") result = (c * 9) / 5 + 32;
      if (to === "K") result = c + 273.15;
      return String(result);
    }
    const table = category === "length" ? LENGTH_UNITS : category === "weight" ? WEIGHT_UNITS : DATA_UNITS;
    const base = v * table[from];
    return String(base / table[to]);
  }, [value, from, to, category]);

  return (
    <>
      <ToolHeader name="Units Converter" description="Convert length, weight, temperature, and data size." />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          {(["length", "weight", "temp", "data"] as const).map((c) => (
            <Button key={c} type="button" variant={category === c ? "primary" : "outline"} onClick={() => setCategory(c)} className="capitalize">
              {c}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-32" />
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <span className="text-zinc-500">→</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <Panel title="Result">
          <p className="font-mono text-2xl text-emerald-300">{output}</p>
        </Panel>
      </div>
    </>
  );
}

export function asciiEncoding() {
  const [input, setInput] = useState("Hi");
  const [mode, setMode] = useState<"to-codes" | "from-codes">("to-codes");
  const [error, setError] = useState<string | null>(null);

  const output = useMemo(() => {
    if (!input) return "";
    try {
      if (mode === "to-codes") {
        return [...input].map((c) => c.charCodeAt(0)).join(" ");
      }
      const codes = input.trim().split(/[\s,]+/).map(Number);
      if (codes.some((n) => Number.isNaN(n))) throw new Error("Invalid code list");
      setError(null);
      return String.fromCharCode(...codes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
      return "";
    }
  }, [input, mode]);

  return (
    <>
      <ToolHeader name="ASCII Encoding" description="Convert text to ASCII codes and back." />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        error={error}
        options={
          <div className="flex gap-2">
            <Button type="button" variant={mode === "to-codes" ? "primary" : "outline"} onClick={() => setMode("to-codes")}>Text → codes</Button>
            <Button type="button" variant={mode === "from-codes" ? "primary" : "outline"} onClick={() => setMode("from-codes")}>Codes → text</Button>
          </div>
        }
      />
    </>
  );
}

export function asciiArt() {
  const [input, setInput] = useState("HELLO");
  const output = useMemo(() => renderBanner(input), [input]);

  return (
    <>
      <ToolHeader name="ASCII Art" description="Render simple banner-style ASCII art from text." />
      <TextIO input={input} output={output} onInputChange={setInput} onClear={() => setInput("")} inputLabel="Text (A-Z, 0-9)" outputFilename="ascii-art.txt" />
    </>
  );
}

export function rubberDuck() {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setNotes(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, notes);
    } catch {
      /* ignore */
    }
  }, [notes]);

  return (
    <>
      <ToolHeader name="Rubber Duck" description="Talk through a bug — local scratchpad, nothing leaves your device." />
      <div className="grid gap-3 lg:grid-cols-[1fr,16rem]">
        <Panel title="Scratchpad">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain the problem out loud…"
            className="min-h-[20rem] border-0 bg-transparent p-0 focus:ring-0"
          />
        </Panel>
        <Panel title="Prompts">
          <ul className="space-y-2 text-sm text-zinc-400">
            {DUCK_PROMPTS.map((p) => (
              <li key={p} className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">{p}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
