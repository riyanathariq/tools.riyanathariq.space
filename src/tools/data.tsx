"use client";

import { diffWords, diffWordsWithSpace, type ChangeObject } from "diff";
import { useEffect, useMemo, useState } from "react";
import { format as formatSql, type SqlLanguage } from "sql-formatter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClearButton,
  CopyButton,
  DownloadButton,
  Panel,
  SampleButton,
  TextIO,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";

const textareaClass =
  "min-h-[16rem] border-0 bg-zinc-950 p-0 font-mono text-sm focus:ring-0 lg:min-h-[20rem]";

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

const LOREM =
  "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum";
const LOREM_WORDS = LOREM.split(/\s+/);

function randomInt(min: number, max: number) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function generateParagraph(minWords: number, maxWords: number): string {
  const count = randomInt(minWords, maxWords);
  const words = Array.from(
    { length: count },
    () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]!,
  );
  words[0] = words[0]!.charAt(0).toUpperCase() + words[0]!.slice(1);
  return `${words.join(" ")}.`;
}

function generateLorem(paragraphs: number, minWords: number, maxWords: number): string {
  return Array.from({ length: paragraphs }, () => generateParagraph(minWords, maxWords)).join("\n\n");
}

const TEXT_DIFF_SAMPLE = {
  left: "The quick brown fox jumps over the lazy dog.\nPack my box with five dozen liquor jugs.",
  right: "The quick brown cat jumps over the lazy dogs.\nPack my box with five dozen liquor jars.",
};

function DiffSidePanel({ parts, side }: { parts: ChangeObject<string>[]; side: "left" | "right" }) {
  return (
    <pre className="max-h-[20rem] overflow-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-200">
      {parts.map((part, i) => {
        if (side === "left" && part.added) return null;
        if (side === "right" && part.removed) return null;
        const highlight = part.removed
          ? "rounded bg-rose-500/25 text-rose-100"
          : part.added
            ? "rounded bg-emerald-500/25 text-emerald-100"
            : "";
        return (
          <span key={i} className={highlight}>
            {part.value}
          </span>
        );
      })}
    </pre>
  );
}

export function jsonPrettier() {
  const meta = getToolBySlug("json-prettier");
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
      <ToolHeader
        name={meta?.name ?? "JSON Prettier"}
        description={meta?.description ?? ""}
        slug="json-prettier"
      />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        outputFilename="output.json"
        error={error}
        options={
          <div className="flex flex-wrap items-center gap-2">
            {(["pretty", "minify", "sort"] as const).map((m) => (
              <Button key={m} type="button" variant={mode === m ? "primary" : "outline"} onClick={() => setMode(m)} className="capitalize">
                {m === "sort" ? "Sort keys" : m}
              </Button>
            ))}
            <SampleButton onClick={() => setInput('{"b":2,"a":1,"c":[3,1,2]}')} />
          </div>
        }
      />
    </>
  );
}

export function jsonPath() {
  const meta = getToolBySlug("json-path");
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
      <ToolHeader
        name={meta?.name ?? "JSON Path"}
        description={meta?.description ?? ""}
        slug="json-path"
      />
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
        <label className="text-sm text-zinc-400">Path</label>
        <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="$.a.b[0]" className="max-w-md flex-1 font-mono" />
        <SampleButton
          onClick={() => {
            setJson('{"user":{"name":"Ada","tags":["go","rust"]}}');
            setPath("$.user.tags[0]");
          }}
        />
      </div>
      <TextIO input={json} output={output} onInputChange={setJson} onClear={() => setJson("")} inputLabel="JSON" outputFilename="result.json" error={error} />
    </>
  );
}

export function regex() {
  const meta = getToolBySlug("regex");
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Contact ada@example.com or bob@test.org");
  const [mode, setMode] = useState<"match" | "replace">("match");
  const [replacement, setReplacement] = useState("[redacted]");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const re = new RegExp(pattern, flags);
      if (mode === "replace") {
        setOutput(text.replace(re, replacement));
        setError(null);
        return;
      }
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
  }, [pattern, flags, text, mode, replacement]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Regular Expression"}
        description={meta?.description ?? ""}
        slug="regex"
      />
      <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
        <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Pattern" className="max-w-md flex-1 font-mono" />
        <Input value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="Flags" className="w-24 font-mono" />
        <Button type="button" variant={mode === "match" ? "primary" : "outline"} onClick={() => setMode("match")}>
          Match
        </Button>
        <Button type="button" variant={mode === "replace" ? "primary" : "outline"} onClick={() => setMode("replace")}>
          Replace
        </Button>
        {mode === "replace" ? (
          <Input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="Replacement" className="max-w-xs font-mono" />
        ) : null}
        <SampleButton
          onClick={() => {
            setPattern("\\b\\w+@\\w+\\.\\w+\\b");
            setFlags("g");
            setText("Contact ada@example.com or bob@test.org");
          }}
        />
      </div>
      <TextIO input={text} output={output} onInputChange={setText} onClear={() => setText("")} inputLabel="Text" outputFilename="matches.txt" error={error} />
    </>
  );
}

export function textDiff() {
  const meta = getToolBySlug("text-diff");
  const [left, setLeft] = useState(TEXT_DIFF_SAMPLE.left);
  const [right, setRight] = useState(TEXT_DIFF_SAMPLE.right);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);

  const diffParts = useMemo(() => {
    const diffFn = ignoreWhitespace ? diffWords : diffWordsWithSpace;
    return diffFn(left, right, { ignoreCase });
  }, [left, right, ignoreWhitespace, ignoreCase]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Text Diff"}
        description={meta?.description ?? ""}
        slug="text-diff"
      />
      <div className="flex min-h-[32rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
              className="accent-emerald-500"
            />
            Ignore whitespace
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={ignoreCase}
              onChange={(e) => setIgnoreCase(e.target.checked)}
              className="accent-emerald-500"
            />
            Ignore case
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLeft(right);
              setRight(left);
            }}
          >
            Swap
          </Button>
          <ClearButton
            onClick={() => {
              setLeft("");
              setRight("");
            }}
          />
          <SampleButton
            label="Sample texts"
            onClick={() => {
              setLeft(TEXT_DIFF_SAMPLE.left);
              setRight(TEXT_DIFF_SAMPLE.right);
            }}
          />
        </div>
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <Panel title="Left">
            <Textarea value={left} onChange={(e) => setLeft(e.target.value)} className={textareaClass} placeholder="Original text…" />
          </Panel>
          <Panel title="Right">
            <Textarea value={right} onChange={(e) => setRight(e.target.value)} className={textareaClass} placeholder="Changed text…" />
          </Panel>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="Diff — left (removed)">
            <DiffSidePanel parts={diffParts} side="left" />
          </Panel>
          <Panel title="Diff — right (added)">
            <DiffSidePanel parts={diffParts} side="right" />
          </Panel>
        </div>
      </div>
    </>
  );
}

export function textCase() {
  const meta = getToolBySlug("text-case");
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
      <ToolHeader
        name={meta?.name ?? "Text Case"}
        description={meta?.description ?? ""}
        slug="text-case"
      />
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
            <SampleButton onClick={() => setInput("hello_world-name")} />
          </div>
        }
      />
    </>
  );
}

const SORT_SAMPLE = "banana\napple\nCherry\n42\n7\napple";

type TextToolkitTab = "stats" | "filter" | "sort" | "format";

export function textToolkit() {
  const meta = getToolBySlug("text-toolkit");
  const [tab, setTab] = useState<TextToolkitTab>("stats");
  const [input, setInput] = useState("");
  const [pattern, setPattern] = useState("");
  const [filterMode, setFilterMode] = useState<"include" | "exclude">("include");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [numeric, setNumeric] = useState(false);
  const [unique, setUnique] = useState(false);
  const [ops, setOps] = useState({ trim: true, collapse: false, dedupe: false });

  const stats = useMemo(() => {
    const bytes = new TextEncoder().encode(input).length;
    const lines = input ? input.split("\n").length : 0;
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    return { chars: input.length, words, lines, bytes };
  }, [input]);

  const filterOutput = useMemo(() => {
    if (!input) return "";
    const lines = input.split("\n");
    if (!pattern) return input;
    const match = (line: string) =>
      ignoreCase ? line.toLowerCase().includes(pattern.toLowerCase()) : line.includes(pattern);
    return lines
      .filter((line) => (filterMode === "include" ? match(line) : !match(line)))
      .join("\n");
  }, [input, pattern, filterMode, ignoreCase]);

  const sortOutput = useMemo(() => {
    let lines = input.split("\n").filter((l, i, arr) => l || i < arr.length - 1);
    if (unique) lines = [...new Set(lines)];
    lines.sort((a, b) => {
      const cmp = numeric ? Number(a) - Number(b) : a.localeCompare(b, undefined, { numeric: true });
      return order === "asc" ? cmp : -cmp;
    });
    return lines.join("\n");
  }, [input, order, numeric, unique]);

  const formatOutput = useMemo(() => {
    let lines = input.split("\n");
    if (ops.trim) lines = lines.map((l) => l.trim());
    if (ops.collapse) lines = lines.map((l) => l.replace(/\s+/g, " "));
    if (ops.dedupe) lines = [...new Set(lines)];
    return lines.join("\n");
  }, [input, ops]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Text Toolkit"}
        description={meta?.description ?? ""}
        slug="text-toolkit"
      />
      <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        {(
          [
            ["stats", "Stats"],
            ["filter", "Filter"],
            ["sort", "Sort"],
            ["format", "Format"],
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

      {tab === "stats" ? (
        <div className="grid min-h-[24rem] gap-3 lg:grid-cols-2">
          <Panel title="Input" actions={<ClearButton onClick={() => setInput("")} />}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste text…"
              className={textareaClass}
            />
          </Panel>
          <Panel title="Statistics">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
                  <dt className="capitalize text-zinc-500">{k}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-emerald-300">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      ) : tab === "filter" ? (
        <TextIO
          input={input}
          output={filterOutput}
          onInputChange={setInput}
          onClear={() => setInput("")}
          options={
            <>
              <Input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="Substring…"
                className="max-w-xs"
              />
              <Button
                type="button"
                variant={filterMode === "include" ? "primary" : "outline"}
                onClick={() => setFilterMode("include")}
              >
                Include
              </Button>
              <Button
                type="button"
                variant={filterMode === "exclude" ? "primary" : "outline"}
                onClick={() => setFilterMode("exclude")}
              >
                Exclude
              </Button>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={ignoreCase}
                  onChange={(e) => setIgnoreCase(e.target.checked)}
                  className="accent-emerald-500"
                />{" "}
                Case-insensitive
              </label>
              <SampleButton
                onClick={() => {
                  setInput("Alpha\nbeta\nGamma\nDELTA\n");
                  setPattern("a");
                  setIgnoreCase(true);
                }}
              />
            </>
          }
        />
      ) : tab === "sort" ? (
        <TextIO
          input={input}
          output={sortOutput}
          onInputChange={setInput}
          onClear={() => setInput("")}
          inputLabel="Lines"
          outputLabel="Sorted lines"
          options={
            <>
              <Button
                type="button"
                variant={order === "asc" ? "primary" : "outline"}
                onClick={() => setOrder("asc")}
              >
                Asc
              </Button>
              <Button
                type="button"
                variant={order === "desc" ? "primary" : "outline"}
                onClick={() => setOrder("desc")}
              >
                Desc
              </Button>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={numeric}
                  onChange={(e) => setNumeric(e.target.checked)}
                  className="accent-emerald-500"
                />{" "}
                Numeric
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={unique}
                  onChange={(e) => setUnique(e.target.checked)}
                  className="accent-emerald-500"
                />{" "}
                Unique
              </label>
              <SampleButton label="Sample lines" onClick={() => setInput(SORT_SAMPLE)} />
            </>
          }
        />
      ) : (
        <TextIO
          input={input}
          output={formatOutput}
          onInputChange={setInput}
          onClear={() => setInput("")}
          options={
            <>
              {(["trim", "collapse", "dedupe"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm capitalize text-zinc-300">
                  <input
                    type="checkbox"
                    checked={ops[k]}
                    onChange={(e) => setOps({ ...ops, [k]: e.target.checked })}
                    className="accent-emerald-500"
                  />{" "}
                  {k === "collapse" ? "Collapse spaces" : k}
                </label>
              ))}
              <SampleButton
                onClick={() => setInput("  hello   world  \n  hello   world  \nfoo")}
              />
            </>
          }
        />
      )}
    </>
  );
}

const SQL_DIALECTS = ["sql", "mysql", "postgresql", "sqlite"] as const satisfies readonly SqlLanguage[];

export function sqlFormat() {
  const meta = getToolBySlug("sql-format");
  const [input, setInput] = useState("SELECT id,name FROM users WHERE active=1 ORDER BY created_at DESC");
  const [dialect, setDialect] = useState<SqlLanguage>("sql");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      setOutput(formatSql(input, { language: dialect }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Format failed");
      setOutput("");
    }
  }, [input, dialect]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "SQL Formatting"}
        description={meta?.description ?? ""}
        slug="sql-format"
      />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        outputFilename="query.sql"
        error={error}
        options={
          <div className="flex flex-wrap items-center gap-2">
            {SQL_DIALECTS.map((d) => (
              <Button key={d} type="button" variant={dialect === d ? "primary" : "outline"} onClick={() => setDialect(d)} className="capitalize">
                {d === "sql" ? "Standard" : d}
              </Button>
            ))}
            <SampleButton
              onClick={() => setInput("SELECT id,name FROM users WHERE active=1 ORDER BY created_at DESC")}
            />
          </div>
        }
      />
    </>
  );
}

export function loremIpsum() {
  const meta = getToolBySlug("lorem-ipsum");
  const [paragraphs, setParagraphs] = useState(3);
  const [minWords, setMinWords] = useState(20);
  const [maxWords, setMaxWords] = useState(60);
  const [seed, setSeed] = useState(0);

  const output = useMemo(
    () => generateLorem(paragraphs, minWords, maxWords),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed triggers regeneration
    [paragraphs, minWords, maxWords, seed],
  );

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Lorem Ipsum"}
        description={meta?.description ?? ""}
        slug="lorem-ipsum"
      />
      <div className="flex min-h-[20rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Paragraphs
            <Input
              type="number"
              min={1}
              max={20}
              value={paragraphs}
              onChange={(e) => setParagraphs(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="w-20"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Min words
            <Input
              type="number"
              min={1}
              max={200}
              value={minWords}
              onChange={(e) => setMinWords(Math.max(1, Number(e.target.value) || 1))}
              className="w-20"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Max words
            <Input
              type="number"
              min={1}
              max={200}
              value={maxWords}
              onChange={(e) => setMaxWords(Math.max(1, Number(e.target.value) || 1))}
              className="w-20"
            />
          </label>
          <Button type="button" variant="outline" onClick={() => setSeed((s) => s + 1)}>
            Regenerate
          </Button>
        </div>
        <Panel
          title="Output"
          actions={
            <>
              <CopyButton value={output} />
              <DownloadButton value={output} filename="lorem-ipsum.txt" />
            </>
          }
        >
          <Textarea value={output} readOnly className={textareaClass} />
        </Panel>
      </div>
    </>
  );
}

