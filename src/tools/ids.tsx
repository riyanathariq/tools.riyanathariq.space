"use client";

import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";
import { nanoid as createNanoid } from "nanoid";
import { useEffect, useMemo, useState } from "react";
import { ulid as createUlid } from "ulid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CopyButton,
  Panel,
  TextIO,
  ToolHeader,
} from "@/components/tool-workspace";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function uuid() {
  const [value, setValue] = useState("");
  const [generated, setGenerated] = useState("");

  const validation = useMemo(() => {
    if (!value.trim()) return null;
    return UUID_RE.test(value.trim()) ? "Valid UUID" : "Invalid UUID format";
  }, [value]);

  return (
    <>
      <ToolHeader name="UUID" description="Generate and validate UUIDs." />
      <div className="flex min-h-[24rem] flex-col gap-3">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          <Button type="button" onClick={() => setGenerated(crypto.randomUUID())}>
            Generate UUID v4
          </Button>
        </div>
        {generated ? (
          <Panel title="Generated" actions={<CopyButton value={generated} />}>
            <p className="font-mono text-emerald-300">{generated}</p>
          </Panel>
        ) : null}
        <Panel title="Validate UUID">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste UUID to validate…"
          />
          {validation ? (
            <p className={`mt-2 text-sm ${validation.startsWith("Valid") ? "text-emerald-400" : "text-rose-400"}`}>
              {validation}
            </p>
          ) : null}
        </Panel>
      </div>
    </>
  );
}

export function ulid() {
  const [ids, setIds] = useState<string[]>([]);
  const [count, setCount] = useState(5);

  const generate = () => {
    setIds(Array.from({ length: count }, () => createUlid()));
  };

  useEffect(() => {
    generate();
  }, []);

  return (
    <>
      <ToolHeader name="ULID" description="Generate Universally Unique Lexicographically Sortable IDs." />
      <div className="flex min-h-[20rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          <label className="text-sm text-zinc-400">
            Count
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="ml-2 inline-block w-16"
            />
          </label>
          <Button type="button" onClick={generate}>
            Generate
          </Button>
        </div>
        <Panel title="ULIDs" actions={<CopyButton value={ids.join("\n")} />}>
          <ul className="space-y-1 font-mono text-sm text-emerald-300">
            {ids.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

export function nanoid() {
  const [ids, setIds] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [size, setSize] = useState(21);

  const generate = () => {
    setIds(Array.from({ length: count }, () => createNanoid(size)));
  };

  useEffect(() => {
    generate();
  }, []);

  return (
    <>
      <ToolHeader name="Nano ID" description="Generate compact URL-friendly unique IDs." />
      <div className="flex min-h-[20rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          <label className="text-sm text-zinc-400">
            Count
            <Input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} className="ml-2 inline-block w-16" />
          </label>
          <label className="text-sm text-zinc-400">
            Size
            <Input type="number" min={8} max={64} value={size} onChange={(e) => setSize(Number(e.target.value) || 21)} className="ml-2 inline-block w-16" />
          </label>
          <Button type="button" onClick={generate}>
            Generate
          </Button>
        </div>
        <Panel title="Nano IDs" actions={<CopyButton value={ids.join("\n")} />}>
          <ul className="space-y-1 font-mono text-sm text-emerald-300">
            {ids.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

export function cron() {
  const [expr, setExpr] = useState("0 9 * * 1-5");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expr.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      const human = cronstrue.toString(expr.trim(), { throwExceptionOnParseError: true });
      const interval = CronExpressionParser.parse(expr.trim());
      const next: string[] = [];
      for (let i = 0; i < 5; i++) {
        next.push(interval.next().toDate().toISOString());
      }
      setOutput(`${human}\n\nNext 5 runs:\n${next.map((d, i) => `${i + 1}. ${d}`).join("\n")}`);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid cron expression");
      setOutput("");
    }
  }, [expr]);

  return (
    <>
      <ToolHeader name="Cron Expression" description="Explain cron expressions and show next run times." />
      <TextIO
        input={expr}
        output={output}
        onInputChange={setExpr}
        onClear={() => setExpr("")}
        inputLabel="Cron expression"
        outputFilename="cron.txt"
        error={error}
      />
    </>
  );
}

type DateMode = "to-iso" | "from-iso" | "ms-to-iso" | "iso-to-ms";

export function datetime() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<DateMode>("to-iso");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      let result = "";
      if (mode === "to-iso") {
        const sec = Number(input.trim());
        if (Number.isNaN(sec)) throw new Error("Invalid Unix seconds");
        result = new Date(sec * 1000).toISOString();
      } else if (mode === "from-iso") {
        const ms = Date.parse(input.trim());
        if (Number.isNaN(ms)) throw new Error("Invalid ISO date");
        result = String(Math.floor(ms / 1000));
      } else if (mode === "ms-to-iso") {
        const ms = Number(input.trim());
        if (Number.isNaN(ms)) throw new Error("Invalid Unix milliseconds");
        result = new Date(ms).toISOString();
      } else {
        const ms = Date.parse(input.trim());
        if (Number.isNaN(ms)) throw new Error("Invalid ISO date");
        result = String(ms);
      }
      setOutput(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
      setOutput("");
    }
  }, [input, mode]);

  const modes: { id: DateMode; label: string }[] = [
    { id: "to-iso", label: "Unix s → ISO" },
    { id: "from-iso", label: "ISO → Unix s" },
    { id: "ms-to-iso", label: "Unix ms → ISO" },
    { id: "iso-to-ms", label: "ISO → Unix ms" },
  ];

  return (
    <>
      <ToolHeader name="Date and Time" description="Convert between Unix timestamps and ISO dates." />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        error={error}
        options={
          <div className="flex flex-wrap gap-2">
            {modes.map((m) => (
              <Button
                key={m.id}
                type="button"
                variant={mode === m.id ? "primary" : "outline"}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        }
      />
    </>
  );
}
