"use client";

import { diffLines } from "diff";
import { useEffect, useMemo, useState } from "react";
import { format as formatSql } from "sql-formatter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CopyButton,
  Panel,
  TextIO,
  ToolHeader,
} from "@/components/tool-workspace";

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortObjectKeys((obj as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return obj;
}

function walkJsonPath(data: unknown, path: string): unknown {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "$") return data;
  let current: unknown = data;
  const segments = trimmed.replace(/^\$\.?/, "").match(/[^.[\]]+|\[\d+\]/g) ?? [];
  for (const seg of segments) {
    if (current == null) return undefined;
    if (seg.startsWith("[") && seg.endsWith("]")) {
      const idx = Number(seg.slice(1, -1));
      if (!Array.isArray(current)) throw new Error(`Expected array at ${seg}`);
      current = current[idx];
    } else {
      if (typeof current !== "object" || Array.isArray(current)) {
        throw new Error(`Expected object at .${seg}`);
      }
      current = (current as Record<string, unknown>)[seg];
    }
  }
  return current;
}

function validateSchema(data: unknown, schema: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const type = schema.type as string | undefined;
  if (type) {
    const actual = Array.isArray(data) ? "array" : data === null ? "null" : typeof data;
    if (type === "integer") {
      if (typeof data !== "number" || !Number.isInteger(data)) errors.push(`Expected integer, got ${actual}`);
    } else if (actual !== type) {
      errors.push(`Expected type ${type}, got ${actual}`);
    }
  }
  if (schema.required && typeof data === "object" && data && !Array.isArray(data)) {
    for (const key of schema.required as string[]) {
      if (!(key in (data as Record<string, unknown>))) errors.push(`Missing required property: ${key}`);
    }
  }
  if (schema.properties && typeof data === "object" && data && !Array.isArray(data)) {
    for (const [key, sub] of Object.entries(schema.properties as Record<string, unknown>)) {
      if (key in (data as Record<string, unknown>)) {
        errors.push(...validateSchema((data as Record<string, unknown>)[key], sub as Record<string, unknown>));
      }
    }
  }
  return errors;
}

function toCamel(s: string) {
  return s.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")).replace(/^./, (c) => c.toLowerCase());
}
function toPascal(s: string) {
  const c = toCamel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}
function toSnake(s: string) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[-\s]+/g, "_").toLowerCase();
}
function toKebab(s: string) {
  return toSnake(s).replace(/_/g, "-");
}
function toTitle(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function basicCodeFormat(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    let indent = 0;
    const lines: string[] = [];
    const parts = input.replace(/\{/g, "{\n").replace(/\}/g, "\n}").replace(/;/g, ";\n").split("\n");
    for (const raw of parts) {
      const line = raw.trim();
      if (!line) continue;
      if (/^[}\]]/.test(line)) indent = Math.max(0, indent - 1);
      lines.push("  ".repeat(indent) + line);
      if (/[\[{]\s*$/.test(line)) indent++;
    }
    return lines.join("\n");
  }
}

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

export function jsonPrettier() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"pretty" | "minify" | "sort">("pretty");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      let parsed = JSON.parse(input);
      if (mode === "sort") parsed = sortObjectKeys(parsed);
      setOutput(mode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      setOutput("");
    }
  }, [input, mode]);

  return (
    <>
      <ToolHeader name="JSON Prettier" description="Format, minify, validate, and sort JSON keys." />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        outputFilename="output.json"
        error={error}
        options={
          <div className="flex gap-2">
            {(["pretty", "minify", "sort"] as const).map((m) => (
              <Button key={m} type="button" variant={mode === m ? "primary" : "outline"} onClick={() => setMode(m)} className="capitalize">
                {m === "sort" ? "Sort keys" : m}
              </Button>
            ))}
          </div>
        }
      />
    </>
  );
}

export function jsonPath() {
  const [json, setJson] = useState('{"user":{"name":"Ada","tags":["go","rust"]}}');
  const [path, setPath] = useState("$.user.tags[0]");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!json.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      const data = JSON.parse(json);
      const result = walkJsonPath(data, path);
      setOutput(JSON.stringify(result, null, 2));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
      setOutput("");
    }
  }, [json, path]);

  return (
    <>
      <ToolHeader name="JSON Path" description="Query JSON with simple path expressions." />
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
        <label className="text-sm text-zinc-400">Path</label>
        <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="$.a.b[0]" className="max-w-md flex-1 font-mono" />
      </div>
      <TextIO input={json} output={output} onInputChange={setJson} onClear={() => setJson("")} inputLabel="JSON" outputFilename="result.json" error={error} />
    </>
  );
}

export function jsonSchema() {
  const [json, setJson] = useState('{"name":"Ada","age":36}');
  const [schema, setSchema] = useState('{"type":"object","required":["name"],"properties":{"name":{"type":"string"},"age":{"type":"integer"}}}');
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = JSON.parse(json);
      const sch = JSON.parse(schema) as Record<string, unknown>;
      const errs = validateSchema(data, sch);
      setOutput(errs.length ? `Invalid:\n${errs.map((e) => `• ${e}`).join("\n")}` : "Valid ✓");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation error");
      setOutput("");
    }
  }, [json, schema]);

  return (
    <>
      <ToolHeader name="JSON Schema" description="Validate JSON against a schema (basic draft checks)." />
      <div className="grid min-h-[28rem] gap-3 lg:grid-cols-2">
        <Panel title="JSON">
          <Textarea value={json} onChange={(e) => setJson(e.target.value)} className="min-h-[12rem] border-0 bg-transparent p-0 font-mono text-sm focus:ring-0" />
        </Panel>
        <Panel title="Schema">
          <Textarea value={schema} onChange={(e) => setSchema(e.target.value)} className="min-h-[12rem] border-0 bg-transparent p-0 font-mono text-sm focus:ring-0" />
        </Panel>
      </div>
      {error ? <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}
      <Panel title="Result" className="mt-3">
        <pre className="whitespace-pre-wrap text-sm text-zinc-200">{output}</pre>
      </Panel>
    </>
  );
}

export function regex() {
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Contact ada@example.com or bob@test.org");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const re = new RegExp(pattern, flags);
      const matches = [...text.matchAll(re)];
      if (!matches.length) {
        setOutput("No matches");
      } else {
        setOutput(
          matches
            .map((m, i) => {
              const groups = m.slice(1).map((g, gi) => `  group ${gi + 1}: ${g ?? ""}`).join("\n");
              return `Match ${i + 1}: "${m[0]}" @ index ${m.index}${groups ? `\n${groups}` : ""}`;
            })
            .join("\n\n"),
        );
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid regex");
      setOutput("");
    }
  }, [pattern, flags, text]);

  return (
    <>
      <ToolHeader name="Regular Expression" description="Test regex patterns with live match groups." />
      <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
        <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Pattern" className="max-w-md flex-1 font-mono" />
        <Input value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="Flags" className="w-24 font-mono" />
      </div>
      <TextIO input={text} output={output} onInputChange={setText} onClear={() => setText("")} inputLabel="Text" outputFilename="matches.txt" error={error} />
    </>
  );
}

export function textDiff() {
  const [left, setLeft] = useState("Line one\nLine two\nLine three");
  const [right, setRight] = useState("Line one\nLine 2\nLine three\nLine four");
  const output = useMemo(() => {
    const changes = diffLines(left, right);
    return changes
      .map((part) => {
        const prefix = part.added ? "+ " : part.removed ? "- " : "  ";
        return part.value
          .split("\n")
          .filter((l, i, arr) => l || i < arr.length - 1)
          .map((line) => prefix + line)
          .join("\n");
      })
      .join("");
  }, [left, right]);

  return (
    <>
      <ToolHeader name="Text Diff" description="Compare two texts and highlight differences." />
      <div className="grid min-h-[28rem] gap-3 lg:grid-cols-2">
        <Panel title="Text A">
          <Textarea value={left} onChange={(e) => setLeft(e.target.value)} className="min-h-[20rem] border-0 bg-transparent p-0 font-mono text-sm focus:ring-0" />
        </Panel>
        <Panel title="Text B">
          <Textarea value={right} onChange={(e) => setRight(e.target.value)} className="min-h-[20rem] border-0 bg-transparent p-0 font-mono text-sm focus:ring-0" />
        </Panel>
      </div>
      <Panel title="Diff (+ added, - removed)" actions={<CopyButton value={output} />} className="mt-3">
        <pre className="max-h-[20rem] overflow-auto whitespace-pre-wrap font-mono text-sm text-zinc-200">{output}</pre>
      </Panel>
    </>
  );
}

export function textCase() {
  const [input, setInput] = useState("hello_world-name");
  const [mode, setMode] = useState<"camel" | "pascal" | "snake" | "kebab" | "upper" | "lower" | "title">("camel");
  const output = useMemo(() => {
    if (!input) return "";
    switch (mode) {
      case "camel": return toCamel(input);
      case "pascal": return toPascal(input);
      case "snake": return toSnake(input);
      case "kebab": return toKebab(input);
      case "upper": return input.toUpperCase();
      case "lower": return input.toLowerCase();
      case "title": return toTitle(input);
    }
  }, [input, mode]);

  return (
    <>
      <ToolHeader name="Text Case" description="Convert between camel, snake, kebab, and more." />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        options={
          <div className="flex flex-wrap gap-2">
            {(["camel", "pascal", "snake", "kebab", "upper", "lower", "title"] as const).map((m) => (
              <Button key={m} type="button" variant={mode === m ? "primary" : "outline"} onClick={() => setMode(m)} className="capitalize">
                {m}
              </Button>
            ))}
          </div>
        }
      />
    </>
  );
}

export function textStatistic() {
  const [input, setInput] = useState("");
  const stats = useMemo(() => {
    const bytes = new TextEncoder().encode(input).length;
    const lines = input ? input.split("\n").length : 0;
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    return { chars: input.length, words, lines, bytes };
  }, [input]);

  return (
    <>
      <ToolHeader name="Text Statistic" description="Count characters, words, lines, and bytes." />
      <div className="grid min-h-[24rem] gap-3 lg:grid-cols-2">
        <Panel title="Input">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste text…" className="min-h-[16rem] border-0 bg-transparent p-0 focus:ring-0" />
        </Panel>
        <Panel title="Statistics">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
                <dt className="text-zinc-500 capitalize">{k}</dt>
                <dd className="mt-1 text-2xl font-semibold text-emerald-300">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </>
  );
}

export function textFilter() {
  const [input, setInput] = useState("");
  const [pattern, setPattern] = useState("");
  const [mode, setMode] = useState<"include" | "exclude">("include");
  const output = useMemo(() => {
    if (!input) return "";
    const lines = input.split("\n");
    if (!pattern) return input;
    return lines
      .filter((line) => (mode === "include" ? line.includes(pattern) : !line.includes(pattern)))
      .join("\n");
  }, [input, pattern, mode]);

  return (
    <>
      <ToolHeader name="Text Filter" description="Filter lines by include/exclude patterns." />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        options={
          <>
            <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Substring…" className="max-w-xs" />
            <Button type="button" variant={mode === "include" ? "primary" : "outline"} onClick={() => setMode("include")}>Include</Button>
            <Button type="button" variant={mode === "exclude" ? "primary" : "outline"} onClick={() => setMode("exclude")}>Exclude</Button>
          </>
        }
      />
    </>
  );
}

export function textSorting() {
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [numeric, setNumeric] = useState(false);
  const [unique, setUnique] = useState(false);
  const output = useMemo(() => {
    let lines = input.split("\n").filter((l, i, arr) => l || i < arr.length - 1);
    if (unique) lines = [...new Set(lines)];
    lines.sort((a, b) => {
      const cmp = numeric ? Number(a) - Number(b) : a.localeCompare(b, undefined, { numeric: true });
      return order === "asc" ? cmp : -cmp;
    });
    return lines.join("\n");
  }, [input, order, numeric, unique]);

  return (
    <>
      <ToolHeader name="Text Sorting" description="Sort lines alphabetically or numerically." />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        options={
          <>
            <Button type="button" variant={order === "asc" ? "primary" : "outline"} onClick={() => setOrder("asc")}>Asc</Button>
            <Button type="button" variant={order === "desc" ? "primary" : "outline"} onClick={() => setOrder("desc")}>Desc</Button>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={numeric} onChange={(e) => setNumeric(e.target.checked)} className="accent-emerald-500" /> Numeric
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} className="accent-emerald-500" /> Unique
            </label>
          </>
        }
      />
    </>
  );
}

export function textFormat() {
  const [input, setInput] = useState("");
  const [ops, setOps] = useState({ trim: true, collapse: false, dedupe: false });
  const output = useMemo(() => {
    let lines = input.split("\n");
    if (ops.trim) lines = lines.map((l) => l.trim());
    if (ops.collapse) lines = lines.map((l) => l.replace(/\s+/g, " "));
    if (ops.dedupe) lines = [...new Set(lines)];
    return lines.join("\n");
  }, [input, ops]);

  return (
    <>
      <ToolHeader name="Text Format" description="Trim, wrap, dedupe, and normalize whitespace." />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        options={
          <>
            {(["trim", "collapse", "dedupe"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm text-zinc-300 capitalize">
                <input type="checkbox" checked={ops[k]} onChange={(e) => setOps({ ...ops, [k]: e.target.checked })} className="accent-emerald-500" /> {k === "collapse" ? "Collapse spaces" : k}
              </label>
            ))}
          </>
        }
      />
    </>
  );
}

export function sqlFormat() {
  const [input, setInput] = useState("SELECT id,name FROM users WHERE active=1 ORDER BY created_at DESC");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      setOutput(formatSql(input, { language: "sql" }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Format failed");
      setOutput("");
    }
  }, [input]);

  return (
    <>
      <ToolHeader name="SQL Formatting" description="Pretty-print SQL queries." />
      <TextIO input={input} output={output} onInputChange={setInput} onClear={() => setInput("")} outputFilename="query.sql" error={error} />
    </>
  );
}

export function loremIpsum() {
  const [paragraphs, setParagraphs] = useState(3);
  const output = useMemo(() => Array.from({ length: paragraphs }, () => LOREM).join("\n\n"), [paragraphs]);

  return (
    <>
      <ToolHeader name="Lorem Ipsum" description="Generate placeholder paragraphs." />
      <div className="flex min-h-[20rem] flex-col gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          <label className="text-sm text-zinc-400">Paragraphs</label>
          <Input type="number" min={1} max={20} value={paragraphs} onChange={(e) => setParagraphs(Number(e.target.value) || 1)} className="w-20" />
        </div>
        <Panel title="Output" actions={<CopyButton value={output} />}>
          <Textarea value={output} readOnly className="min-h-[16rem] border-0 bg-transparent p-0 focus:ring-0" />
        </Panel>
      </div>
    </>
  );
}

export function codeFormat() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      setOutput(basicCodeFormat(input));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Format failed");
      setOutput("");
    }
  }, [input]);

  return (
    <>
      <ToolHeader name="Code Style Formatting" description="Format JSON, JS-ish objects, and CSS-ish blocks lightly." />
      <TextIO input={input} output={output} onInputChange={setInput} onClear={() => setInput("")} outputFilename="formatted.txt" error={error} />
    </>
  );
}
