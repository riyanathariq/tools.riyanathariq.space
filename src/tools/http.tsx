"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ClearButton,
  CopyButton,
  DownloadButton,
  Panel,
  SampleButton,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";

type ParsedCurl = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  auth?: { user: string; pass: string };
};

type Lang = "fetch" | "python" | "go" | "curl" | "axios";

const SAMPLE =
  'curl -X POST https://api.example.com/users -H "Content-Type: application/json" -u user:pass -d \'{"name":"Ada"}\'';

const LANGS: { id: Lang; label: string; ext: string }[] = [
  { id: "fetch", label: "fetch", ext: "fetch.js" },
  { id: "python", label: "Python (requests)", ext: "request.py" },
  { id: "go", label: "Go", ext: "main.go" },
  { id: "curl", label: "cURL", ext: "curl.sh" },
  { id: "axios", label: "Node (axios)", ext: "axios.js" },
];

function parseCurl(cmd: string): ParsedCurl {
  const tokens: string[] = [];
  let cur = "";
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === "'" || c === '"') {
      quote = c;
    } else if (/\s/.test(c)) {
      if (cur) {
        tokens.push(cur);
        cur = "";
      }
    } else {
      cur += c;
    }
  }
  if (cur) tokens.push(cur);

  let method = "GET";
  let url = "";
  const headers: Record<string, string> = {};
  let body = "";
  let auth: ParsedCurl["auth"];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "curl") continue;
    if (t === "-X" || t === "--request") {
      method = tokens[++i]?.toUpperCase() ?? "GET";
    } else if (t === "-H" || t === "--header") {
      const h = tokens[++i] ?? "";
      const idx = h.indexOf(":");
      if (idx > -1) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (
      t === "-d" ||
      t === "--data" ||
      t === "--data-raw" ||
      t === "--data-binary" ||
      t === "--data-urlencode"
    ) {
      body = tokens[++i] ?? "";
      if (method === "GET") method = "POST";
    } else if (t === "-u" || t === "--user") {
      const cred = tokens[++i] ?? "";
      const colon = cred.indexOf(":");
      if (colon > -1) {
        auth = { user: cred.slice(0, colon), pass: cred.slice(colon + 1) };
      } else {
        auth = { user: cred, pass: "" };
      }
    } else if (t === "--url") {
      url = tokens[++i] ?? "";
    } else if (t.startsWith("http://") || t.startsWith("https://")) {
      url = t;
    }
  }

  if (!url) throw new Error("Could not find URL in curl command");
  return { method, url, headers, body, auth };
}

function shellQuote(s: string): string {
  if (!/[\s'"\\$`!]/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function toNormalizedCurl({ method, url, headers, body, auth }: ParsedCurl): string {
  const parts = ["curl", "-X", method, shellQuote(url)];
  if (auth) {
    parts.push("-u", shellQuote(`${auth.user}:${auth.pass}`));
  }
  for (const [k, v] of Object.entries(headers)) {
    if (auth && k.toLowerCase() === "authorization") continue;
    parts.push("-H", shellQuote(`${k}: ${v}`));
  }
  if (body) parts.push("-d", shellQuote(body));
  return parts.join(" ");
}

function toFetch(p: ParsedCurl): string {
  const hdrLines = Object.entries(p.headers)
    .map(([k, v]) => `    "${k}": "${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}",`)
    .join("\n");
  const bodyPart = p.body ? `\n  body: ${JSON.stringify(p.body)},` : "";
  return `const response = await fetch("${p.url}", {
  method: "${p.method}",${hdrLines ? `\n  headers: {\n${hdrLines}\n  },` : ""}${bodyPart}
});
const data = await response.json();`;
}

function toPython(p: ParsedCurl): string {
  const lines = ["import requests", ""];
  if (p.auth) {
    lines.push(`auth = ("${p.auth.user.replace(/"/g, '\\"')}", "${p.auth.pass.replace(/"/g, '\\"')}")`);
  }
  const hdrEntries = Object.entries(p.headers);
  if (hdrEntries.length) {
    lines.push("headers = {");
    for (const [k, v] of hdrEntries) {
      lines.push(`    "${k}": "${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}",`);
    }
    lines.push("}");
  }
  const kwargs: string[] = [`"${p.method}"`, `"${p.url}"`];
  if (hdrEntries.length) kwargs.push("headers=headers");
  if (p.auth) kwargs.push("auth=auth");
  if (p.body) kwargs.push(`data=${JSON.stringify(p.body)}`);
  lines.push(`response = requests.request(${kwargs.join(", ")})`);
  lines.push("print(response.status_code, response.text)");
  return lines.join("\n");
}

function toGo(p: ParsedCurl): string {
  const lines = [
    "package main",
    "",
    "import (",
    '\t"bytes"',
    '\t"fmt"',
    '\t"net/http"',
    ")",
    "",
    "func main() {",
  ];
  if (p.body) {
    lines.push(`\tbody := []byte(${JSON.stringify(p.body)})`);
    lines.push("\treq, err := http.NewRequest(" + `"${p.method}", "${p.url}", bytes.NewReader(body))`);
  } else {
    lines.push("\treq, err := http.NewRequest(" + `"${p.method}", "${p.url}", nil)`);
  }
  lines.push("\tif err != nil {");
  lines.push("\t\tpanic(err)");
  lines.push("\t}");
  for (const [k, v] of Object.entries(p.headers)) {
    lines.push(`\treq.Header.Set("${k.replace(/"/g, '\\"')}", "${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`);
  }
  if (p.auth) {
    lines.push(`\treq.SetBasicAuth("${p.auth.user.replace(/"/g, '\\"')}", "${p.auth.pass.replace(/"/g, '\\"')}")`);
  }
  lines.push("\tresp, err := http.DefaultClient.Do(req)");
  lines.push("\tif err != nil {");
  lines.push("\t\tpanic(err)");
  lines.push("\t}");
  lines.push("\tdefer resp.Body.Close()");
  lines.push('\tfmt.Println("status:", resp.Status)');
  lines.push("}");
  return lines.join("\n");
}

function toAxios(p: ParsedCurl): string {
  const config: string[] = [`  method: "${p.method.toLowerCase()}",`, `  url: "${p.url}",`];
  const hdrLines = Object.entries(p.headers)
    .map(([k, v]) => `    "${k}": "${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}",`)
    .join("\n");
  if (hdrLines) config.push(`  headers: {\n${hdrLines}\n  },`);
  if (p.auth) {
    config.push(`  auth: { username: "${p.auth.user.replace(/"/g, '\\"')}", password: "${p.auth.pass.replace(/"/g, '\\"')}" },`);
  }
  if (p.body) config.push(`  data: ${JSON.stringify(p.body)},`);
  return `const axios = require("axios");

const response = await axios({
${config.join("\n")}
});
console.log(response.status, response.data);`;
}

function generate(lang: Lang, parsed: ParsedCurl): string {
  switch (lang) {
    case "fetch":
      return toFetch(parsed);
    case "python":
      return toPython(parsed);
    case "go":
      return toGo(parsed);
    case "curl":
      return toNormalizedCurl(parsed);
    case "axios":
      return toAxios(parsed);
  }
}

export function curlExplainer() {
  const meta = getToolBySlug("curl-explainer");
  const [input, setInput] = useState(SAMPLE);
  const [lang, setLang] = useState<Lang>("fetch");

  const { output, error, filename } = useMemo(() => {
    const ext = LANGS.find((l) => l.id === lang)?.ext ?? "output.txt";
    if (!input.trim()) return { output: "", error: null as string | null, filename: ext };
    try {
      const parsed = parseCurl(input.trim());
      return { output: generate(lang, parsed), error: null, filename: ext };
    } catch (e) {
      return {
        output: "",
        error: e instanceof Error ? e.message : "Parse failed",
        filename: ext,
      };
    }
  }, [input, lang]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "cURL Converter"}
        description={meta?.description ?? "Convert curl commands into client code."}
        slug="curl-explainer"
      />
      <div className="flex h-full min-h-[28rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          {LANGS.map((l) => (
            <Button
              key={l.id}
              type="button"
              variant={lang === l.id ? "primary" : "outline"}
              onClick={() => setLang(l.id)}
            >
              {l.label}
            </Button>
          ))}
          <SampleButton onClick={() => setInput(SAMPLE)} />
        </div>
        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <Panel title="cURL command" actions={<ClearButton onClick={() => setInput("")} />}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a curl command…"
              className="min-h-[16rem] border-0 bg-zinc-950 p-0 font-mono text-sm focus:ring-0 lg:min-h-[22rem]"
            />
          </Panel>
          <Panel
            title="Generated code"
            actions={
              output ? (
                <>
                  <CopyButton value={output} />
                  <DownloadButton value={output} filename={filename} />
                </>
              ) : undefined
            }
          >
            <Textarea
              value={output}
              readOnly
              placeholder="Client code appears here…"
              className="min-h-[16rem] border-0 bg-zinc-950 p-0 font-mono text-sm focus:ring-0 lg:min-h-[22rem]"
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

function shellSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function shellDoubleQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`")}"`;
}

export function cliHelpers() {
  const meta = getToolBySlug("cli-helpers");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"sq" | "dq" | "printf">("sq");

  const output = useMemo(() => {
    if (!input) return "";
    if (mode === "sq") return shellSingleQuote(input);
    if (mode === "dq") return shellDoubleQuote(input);
    return `printf '%s\\n' ${shellSingleQuote(input)}`;
  }, [input, mode]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "CLI Command Helpers"}
        description={meta?.description ?? "Quick encode/quote helpers for shell commands."}
        slug="cli-helpers"
      />
      <div className="flex h-full min-h-[28rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <Button type="button" variant={mode === "sq" ? "primary" : "outline"} onClick={() => setMode("sq")}>
            Single-quote
          </Button>
          <Button type="button" variant={mode === "dq" ? "primary" : "outline"} onClick={() => setMode("dq")}>
            Double-quote
          </Button>
          <Button type="button" variant={mode === "printf" ? "primary" : "outline"} onClick={() => setMode("printf")}>
            printf helper
          </Button>
        </div>
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <Panel title="Input" actions={<ClearButton onClick={() => setInput("")} />}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste text to quote…"
              className="min-h-[16rem] border-0 bg-zinc-950 p-0 focus:ring-0 lg:min-h-[22rem]"
            />
          </Panel>
          <Panel
            title="Output"
            actions={
              output ? (
                <>
                  <CopyButton value={output} />
                  <DownloadButton value={output} filename="quoted.sh" />
                </>
              ) : undefined
            }
          >
            <Textarea
              value={output}
              readOnly
              placeholder="Quoted output appears here…"
              className="min-h-[16rem] border-0 bg-zinc-950 p-0 font-mono text-sm focus:ring-0 lg:min-h-[22rem]"
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
