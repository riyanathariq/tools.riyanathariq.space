"use client";

import hljs from "highlight.js/lib/common";
import { dump, load } from "js-yaml";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { useEffect, useMemo, useState } from "react";
import { parse as parseToml, TomlError } from "smol-toml";

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
import { MARKDOWN_SAMPLE } from "@/data/markdown-preview-sample";
import { getToolBySlug } from "@/data/tools-registry";

import "highlight.js/styles/github-dark.css";

const textareaClass =
  "min-h-[16rem] border-0 bg-zinc-950 p-0 font-mono text-sm focus:ring-0 lg:min-h-[20rem]";

const mdMarked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    emptyLangClass: "hljs",
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  }),
  {
    gfm: true,
    breaks: false,
  },
);

function stripScriptTags(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    let line = trimmed;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function parseOpenApiInput(input: string): unknown {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Paste OpenAPI JSON or YAML");
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  return load(trimmed);
}

const YAML_JSON_SAMPLE = `name: Ada
version: 1
tags:
  - go
  - rust
`;

const JSON_YAML_SAMPLE = `{
  "name": "Ada",
  "version": 1,
  "tags": ["go", "rust"]
}`;

const ENV_SAMPLE = `# App config
APP_NAME=MyApp
PORT=8080
DEBUG=true
DATABASE_URL="postgres://localhost/db"
`;

const TOML_SAMPLE = `[server]
host = "127.0.0.1"
port = 8080

[database]
name = "app"
`;

const OPENAPI_SAMPLE = `openapi: 3.0.0
info:
  title: Sample API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
    post:
      summary: Create user
  /users/{id}:
    get:
      summary: Get user by ID
    delete:
      summary: Delete user
`;

const URL_SAMPLE = "https://user:pass@example.com:8080/api/v1/search?q=hello&page=2#results";

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

export function markdownPreview() {
  const meta = getToolBySlug("markdown-preview");
  const [input, setInput] = useState(MARKDOWN_SAMPLE);

  const html = useMemo(() => {
    if (!input.trim()) return "";
    try {
      const raw = mdMarked.parse(input, { async: false }) as string;
      return stripScriptTags(raw);
    } catch {
      return "";
    }
  }, [input]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Markdown Preview"}
        description={meta?.description ?? "Live Markdown preview with HTML output."}
        slug="markdown-preview"
      />
      <div className="flex min-h-[32rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <SampleButton onClick={() => setInput(MARKDOWN_SAMPLE)} />
          <CopyButton value={input} />
          <DownloadButton value={input} filename="document.md" />
        </div>
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <Panel title="Markdown" actions={<ClearButton onClick={() => setInput("")} />}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write Markdown…"
              spellCheck={false}
              className={`${textareaClass} min-h-[22rem] lg:min-h-[32rem]`}
            />
          </Panel>
          <Panel title="Preview">
            <div className="min-h-[22rem] overflow-auto rounded-xl border border-zinc-800/80 bg-[#0c0c0e] p-4 sm:p-5 lg:min-h-[32rem]">
              {html ? (
                <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <p className="text-sm text-zinc-500">Preview appears here…</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function yamlJson() {
  const meta = getToolBySlug("yaml-json");
  const [tab, setTab] = useState<"yaml-to-json" | "json-to-yaml">("yaml-to-json");
  const [input, setInput] = useState(YAML_JSON_SAMPLE);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      if (tab === "yaml-to-json") {
        setOutput(JSON.stringify(load(input), null, 2));
      } else {
        setOutput(dump(JSON.parse(input), { indent: 2, lineWidth: 120 }));
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
      setOutput("");
    }
  }, [input, tab]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "YAML ↔ JSON"}
        description={meta?.description ?? "Convert between YAML and JSON."}
        slug="yaml-json"
      />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        inputLabel={tab === "yaml-to-json" ? "YAML" : "JSON"}
        outputLabel={tab === "yaml-to-json" ? "JSON" : "YAML"}
        outputFilename={tab === "yaml-to-json" ? "output.json" : "output.yaml"}
        error={error}
        options={
          <>
            <Button
              type="button"
              variant={tab === "yaml-to-json" ? "primary" : "outline"}
              onClick={() => {
                setTab("yaml-to-json");
                setInput(YAML_JSON_SAMPLE);
              }}
            >
              YAML → JSON
            </Button>
            <Button
              type="button"
              variant={tab === "json-to-yaml" ? "primary" : "outline"}
              onClick={() => {
                setTab("json-to-yaml");
                setInput(JSON_YAML_SAMPLE);
              }}
            >
              JSON → YAML
            </Button>
            <SampleButton
              onClick={() => setInput(tab === "yaml-to-json" ? YAML_JSON_SAMPLE : JSON_YAML_SAMPLE)}
            />
          </>
        }
      />
    </>
  );
}

export function envToml() {
  const meta = getToolBySlug("env-toml");
  const [tab, setTab] = useState<"env" | "toml">("env");
  const [input, setInput] = useState(ENV_SAMPLE);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      if (tab === "env") {
        setOutput(JSON.stringify(parseEnv(input), null, 2));
      } else {
        setOutput(JSON.stringify(parseToml(input), null, 2));
      }
      setError(null);
    } catch (e) {
      const msg =
        e instanceof TomlError
          ? `${e.message}${e.line != null ? ` (line ${e.line})` : ""}`
          : e instanceof Error
            ? e.message
            : "Parse failed";
      setError(msg);
      setOutput("");
    }
  }, [input, tab]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? ".env / TOML → JSON"}
        description={meta?.description ?? "Parse .env or TOML into JSON."}
        slug="env-toml"
      />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        inputLabel={tab === "env" ? ".env" : "TOML"}
        outputLabel="JSON"
        outputFilename="output.json"
        error={error}
        options={
          <>
            <Button
              type="button"
              variant={tab === "env" ? "primary" : "outline"}
              onClick={() => {
                setTab("env");
                setInput(ENV_SAMPLE);
              }}
            >
              .env → JSON
            </Button>
            <Button
              type="button"
              variant={tab === "toml" ? "primary" : "outline"}
              onClick={() => {
                setTab("toml");
                setInput(TOML_SAMPLE);
              }}
            >
              TOML → JSON
            </Button>
            <SampleButton onClick={() => setInput(tab === "env" ? ENV_SAMPLE : TOML_SAMPLE)} />
          </>
        }
      />
    </>
  );
}

type OpenApiEndpoint = {
  path: string;
  method: string;
  summary?: string;
  operationId?: string;
};

export function openapiViewer() {
  const meta = getToolBySlug("openapi-viewer");
  const [input, setInput] = useState(OPENAPI_SAMPLE);
  const [error, setError] = useState<string | null>(null);

  const { info, endpoints } = useMemo(() => {
    if (!input.trim()) return { info: null as Record<string, unknown> | null, endpoints: [] as OpenApiEndpoint[] };
    try {
      const doc = parseOpenApiInput(input) as {
        info?: Record<string, unknown>;
        paths?: Record<string, Record<string, { summary?: string; operationId?: string }>>;
      };
      const paths = doc.paths ?? {};
      const list: OpenApiEndpoint[] = [];
      for (const [path, ops] of Object.entries(paths)) {
        for (const [method, detail] of Object.entries(ops)) {
          if (!HTTP_METHODS.has(method.toLowerCase())) continue;
          list.push({
            path,
            method: method.toUpperCase(),
            summary: detail.summary,
            operationId: detail.operationId,
          });
        }
      }
      list.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
      return { info: doc.info ?? null, endpoints: list, error: null };
    } catch (e) {
      return {
        info: null,
        endpoints: [] as OpenApiEndpoint[],
        error: e instanceof Error ? e.message : "Invalid OpenAPI document",
      };
    }
  }, [input]);

  useEffect(() => {
    if (!input.trim()) {
      setError(null);
      return;
    }
    try {
      parseOpenApiInput(input);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OpenAPI document");
    }
  }, [input]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "OpenAPI Viewer"}
        description={meta?.description ?? "Browse paths and operations from OpenAPI 3 specs."}
        slug="openapi-viewer"
      />
      <div className="flex min-h-[28rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <SampleButton onClick={() => setInput(OPENAPI_SAMPLE)} />
          <ClearButton onClick={() => setInput("")} />
        </div>
        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <Panel title="OpenAPI (JSON or YAML)">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste OpenAPI 3 spec…"
              className={textareaClass}
            />
          </Panel>
          <Panel title="Operations">
            {info ? (
              <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">
                <p className="font-medium text-zinc-100">{String(info.title ?? "Untitled API")}</p>
                {info.version != null ? (
                  <p className="mt-1 text-zinc-500">Version {String(info.version)}</p>
                ) : null}
                {info.description ? (
                  <p className="mt-2 text-zinc-400">{String(info.description)}</p>
                ) : null}
              </div>
            ) : null}
            <div className="max-h-[22rem] space-y-2 overflow-auto">
              {endpoints.length === 0 ? (
                <p className="text-sm text-zinc-500">No operations found.</p>
              ) : (
                endpoints.map((ep) => (
                  <div
                    key={`${ep.method}-${ep.path}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-300">
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm text-zinc-200">{ep.path}</span>
                    </div>
                    {ep.summary ? <p className="mt-2 text-sm text-zinc-400">{ep.summary}</p> : null}
                    {ep.operationId ? (
                      <p className="mt-1 font-mono text-xs text-zinc-500">{ep.operationId}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

type QueryParam = { key: string; value: string };

export function urlParser() {
  const meta = getToolBySlug("url-parser");
  const [input, setInput] = useState(URL_SAMPLE);
  const [params, setParams] = useState<QueryParam[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    try {
      const url = new URL(input.trim());
      return {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? "443" : url.protocol === "http:" ? "80" : ""),
        pathname: url.pathname,
        hash: url.hash,
        username: url.username,
        password: url.password,
      };
    } catch (e) {
      return null;
    }
  }, [input]);

  useEffect(() => {
    if (!input.trim()) {
      setParams([]);
      setParseError(null);
      return;
    }
    try {
      const url = new URL(input.trim());
      const next: QueryParam[] = [];
      url.searchParams.forEach((value, key) => next.push({ key, value }));
      setParams(next);
      setParseError(null);
    } catch (e) {
      setParams([]);
      setParseError(e instanceof Error ? e.message : "Invalid URL");
    }
  }, [input]);

  const rebuilt = useMemo(() => {
    if (!parsed) return "";
    try {
      const proto = parsed.protocol || "https:";
      const url = new URL(`${proto}//${parsed.hostname}`);
      if (parsed.port && parsed.port !== "80" && parsed.port !== "443") url.port = parsed.port;
      if (parsed.username) url.username = parsed.username;
      if (parsed.password) url.password = parsed.password;
      url.pathname = parsed.pathname || "/";
      url.hash = parsed.hash;
      url.search = "";
      for (const { key, value } of params) {
        if (key) url.searchParams.append(key, value);
      }
      return url.toString();
    } catch {
      return "";
    }
  }, [parsed, params]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "URL Parser"}
        description={meta?.description ?? "Inspect and rebuild URL components."}
        slug="url-parser"
      />
      <div className="flex min-h-[28rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://example.com/path?q=1"
            className="min-w-[16rem] flex-1 font-mono"
          />
          <SampleButton onClick={() => setInput(URL_SAMPLE)} />
          <ClearButton onClick={() => setInput("")} />
        </div>
        {parseError ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {parseError}
          </p>
        ) : null}
        {parsed ? (
          <>
            <Panel title="Components">
              <dl className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["Protocol", parsed.protocol],
                    ["Host", parsed.hostname],
                    ["Port", parsed.port || "—"],
                    ["Path", parsed.pathname],
                    ["Hash", parsed.hash || "—"],
                    ["User", parsed.username || "—"],
                    ["Password", parsed.password ? "••••" : "—"],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
                    <dd className="mt-1 break-all font-mono text-sm text-zinc-200">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel
              title="Query parameters"
              actions={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setParams((p) => [...p, { key: "", value: "" }])}
                >
                  Add row
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-zinc-500">
                      <th className="pb-2 pr-3 font-medium">Key</th>
                      <th className="pb-2 pr-3 font-medium">Value</th>
                      <th className="pb-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {params.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-zinc-500">
                          No query parameters
                        </td>
                      </tr>
                    ) : (
                      params.map((row, i) => (
                        <tr key={i} className="border-b border-zinc-800/60">
                          <td className="py-2 pr-3">
                            <Input
                              value={row.key}
                              onChange={(e) => {
                                const next = [...params];
                                next[i] = { ...next[i]!, key: e.target.value };
                                setParams(next);
                              }}
                              className="font-mono"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <Input
                              value={row.value}
                              onChange={(e) => {
                                const next = [...params];
                                next[i] = { ...next[i]!, value: e.target.value };
                                setParams(next);
                              }}
                              className="font-mono"
                            />
                          </td>
                          <td className="py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 min-h-9"
                              onClick={() => setParams(params.filter((_, j) => j !== i))}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
            {rebuilt ? (
              <Panel title="Rebuilt URL" actions={<CopyButton value={rebuilt} />}>
                <p className="break-all font-mono text-sm text-emerald-300">{rebuilt}</p>
              </Panel>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
