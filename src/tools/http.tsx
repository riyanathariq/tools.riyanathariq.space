"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextIO, ToolHeader } from "@/components/tool-workspace";

function parseCurl(cmd: string) {
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

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "curl") continue;
    if (t === "-X" || t === "--request") {
      method = tokens[++i]?.toUpperCase() ?? "GET";
    } else if (t === "-H" || t === "--header") {
      const h = tokens[++i] ?? "";
      const idx = h.indexOf(":");
      if (idx > -1) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary") {
      body = tokens[++i] ?? "";
      if (method === "GET") method = "POST";
    } else if (t === "--url") {
      url = tokens[++i] ?? "";
    } else if (t.startsWith("http://") || t.startsWith("https://")) {
      url = t;
    }
  }

  if (!url) throw new Error("Could not find URL in curl command");
  return { method, url, headers, body };
}

function toFetch({ method, url, headers, body }: ReturnType<typeof parseCurl>): string {
  const hdrLines = Object.entries(headers)
    .map(([k, v]) => `    "${k}": "${v.replace(/"/g, '\\"')}",`)
    .join("\n");
  const bodyPart = body
    ? `\n  body: ${JSON.stringify(body)},`
    : "";
  return `const response = await fetch("${url}", {
  method: "${method}",${hdrLines ? `\n  headers: {\n${hdrLines}\n  },` : ""}${bodyPart}
});
const data = await response.json();`;
}

export function curlExplainer() {
  const [input, setInput] = useState('curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d \'{"name":"Ada"}\'');
  const { output, error: parseError } = useMemo(() => {
    if (!input.trim()) return { output: "", error: null as string | null };
    try {
      const parsed = parseCurl(input.trim());
      return {
        output: [
          `Method: ${parsed.method}`,
          `URL: ${parsed.url}`,
          `Headers:\n${Object.entries(parsed.headers).map(([k, v]) => `  ${k}: ${v}`).join("\n") || "  (none)"}`,
          `Body:\n${parsed.body || "  (empty)"}`,
          "\n--- fetch() snippet ---\n",
          toFetch(parsed),
        ].join("\n"),
        error: null,
      };
    } catch (e) {
      return {
        output: "",
        error: e instanceof Error ? e.message : "Parse failed",
      };
    }
  }, [input]);

  return (
    <>
      <ToolHeader name="cURL Explainer" description="Parse curl commands into structured requests and generate fetch code." />
      <TextIO input={input} output={output} onInputChange={setInput} onClear={() => setInput("")} inputLabel="cURL command" outputFilename="fetch.js" error={parseError} />
    </>
  );
}

function shellSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function cliHelpers() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"sq" | "printf">("sq");

  const output = useMemo(() => {
    if (!input) return "";
    if (mode === "sq") return shellSingleQuote(input);
    return `printf '%s\\n' ${shellSingleQuote(input)}`;
  }, [input, mode]);

  return (
    <>
      <ToolHeader name="CLI Command Helpers" description="Quick encode/quote helpers for shell commands." />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        options={
          <div className="flex gap-2">
            <Button type="button" variant={mode === "sq" ? "primary" : "outline"} onClick={() => setMode("sq")}>
              Single-quote escape
            </Button>
            <Button type="button" variant={mode === "printf" ? "primary" : "outline"} onClick={() => setMode("printf")}>
              printf helper
            </Button>
          </div>
        }
      />
    </>
  );
}
