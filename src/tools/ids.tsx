"use client";

import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";
import { nanoid as createNanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { decodeTime, ulid as createUlid, isValid as isValidUlid } from "ulid";

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bytesToUuid(bytes: Uint8Array): string {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** RFC 9562 UUIDv7 (48-bit Unix ms + random). */
function uuidv7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const now = Date.now();
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

function parseUuidParts(raw: string) {
  const value = raw.trim().toLowerCase();
  if (!UUID_RE.test(value)) return null;
  const hex = value.replace(/-/g, "");
  const version = parseInt(hex[12], 16);
  const variantNibble = parseInt(hex[16], 16);
  const variant =
    (variantNibble & 0xc) === 0x8
      ? "RFC 4122 / 9562"
      : (variantNibble & 0xe) === 0xc
        ? "Microsoft"
        : (variantNibble & 0xe) === 0xe
          ? "Future"
          : "NCS";
  let timestampMs: number | null = null;
  if (version === 7) {
    timestampMs = parseInt(hex.slice(0, 12), 16);
  }
  return { value, version, variant, timestampMs };
}

type UuidTab = "generate" | "validate";

export function uuid() {
  const meta = getToolBySlug("uuid");
  const [tab, setTab] = useState<UuidTab>("generate");
  const [version, setVersion] = useState<"v4" | "v7">("v4");
  const [count, setCount] = useState(1);
  const [generated, setGenerated] = useState("");
  const [validateInput, setValidateInput] = useState("");

  const generate = useCallback(() => {
    const n = Math.min(100, Math.max(1, count));
    const lines = Array.from({ length: n }, () =>
      version === "v4" ? crypto.randomUUID() : uuidv7(),
    );
    setGenerated(lines.join("\n"));
  }, [count, version]);

  useEffect(() => {
    generate();
  }, []); // initial sample

  const validations = useMemo(() => {
    const lines = validateInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => {
      const parsed = parseUuidParts(line);
      if (!parsed) return { line, ok: false as const, detail: "Invalid UUID format" };
      const bits = [
        `Version ${parsed.version}`,
        `Variant: ${parsed.variant}`,
      ];
      if (parsed.timestampMs != null && Number.isFinite(parsed.timestampMs)) {
        bits.push(`Timestamp: ${new Date(parsed.timestampMs).toISOString()} (${parsed.timestampMs} ms)`);
      }
      if (parsed.value === "00000000-0000-0000-0000-000000000000") bits.push("Nil UUID");
      if (parsed.value === "ffffffff-ffff-ffff-ffff-ffffffffffff") bits.push("Max UUID");
      return { line, ok: true as const, detail: bits.join(" · ") };
    });
  }, [validateInput]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "UUID"}
        description={meta?.description ?? ""}
        slug="uuid"
      />
      <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        {(["generate", "validate"] as const).map((t) => (
          <Button
            key={t}
            type="button"
            variant={tab === t ? "primary" : "outline"}
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      {tab === "generate" ? (
        <div className="flex min-h-[24rem] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            {(["v4", "v7"] as const).map((v) => (
              <Button
                key={v}
                type="button"
                variant={version === v ? "primary" : "outline"}
                onClick={() => setVersion(v)}
              >
                UUID {v}
              </Button>
            ))}
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              Count
              <Input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                className="w-20"
              />
            </label>
            <Button type="button" onClick={generate}>
              Generate
            </Button>
          </div>
          <Panel
            title="Generated"
            actions={
              <>
                <CopyButton value={generated} />
                <DownloadButton value={generated} filename="uuids.txt" />
              </>
            }
          >
            <Textarea
              value={generated}
              readOnly
              className="min-h-[16rem] border-0 bg-zinc-950 p-0 font-mono text-emerald-300 focus:ring-0"
            />
          </Panel>
        </div>
      ) : (
        <div className="flex min-h-[24rem] flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <SampleButton
              onClick={() =>
                setValidateInput(
                  `${crypto.randomUUID()}\n${uuidv7()}\nnot-a-uuid\n00000000-0000-0000-0000-000000000000`,
                )
              }
            />
            <ClearButton onClick={() => setValidateInput("")} />
          </div>
          <Panel title="UUIDs (one per line)">
            <Textarea
              value={validateInput}
              onChange={(e) => setValidateInput(e.target.value)}
              placeholder="Paste UUIDs to validate…"
              className="min-h-[10rem] border-0 bg-zinc-950 p-0 focus:ring-0"
            />
          </Panel>
          <Panel title="Results">
            {validations.length === 0 ? (
              <p className="text-sm text-zinc-500">Validation results appear here…</p>
            ) : (
              <ul className="space-y-2">
                {validations.map((row) => (
                  <li
                    key={row.line + row.detail}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm"
                  >
                    <p className={row.ok ? "text-emerald-300" : "text-rose-300"}>{row.line}</p>
                    <p className={`mt-1 text-xs ${row.ok ? "text-zinc-400" : "text-rose-400"}`}>
                      {row.ok ? `Valid · ${row.detail}` : row.detail}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

type UlidTab = "generate" | "validate";

export function ulid() {
  const meta = getToolBySlug("ulid");
  const [tab, setTab] = useState<UlidTab>("generate");
  const [count, setCount] = useState(5);
  const [ids, setIds] = useState<string[]>([]);
  const [validateInput, setValidateInput] = useState("");
  const [upper, setUpper] = useState(true);

  const generate = useCallback(() => {
    const n = Math.min(100, Math.max(1, count));
    const next = Array.from({ length: n }, () => {
      const id = createUlid();
      return upper ? id : id.toLowerCase();
    });
    setIds(next);
  }, [count, upper]);

  useEffect(() => {
    generate();
  }, []);

  const validations = useMemo(() => {
    const lines = validateInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => {
      const normalized = line.toUpperCase();
      if (!isValidUlid(normalized)) {
        return { line, ok: false as const, detail: "Invalid ULID (expect 26 Crockford Base32 chars)" };
      }
      try {
        const ms = decodeTime(normalized);
        return {
          line: normalized,
          ok: true as const,
          detail: `Timestamp: ${new Date(ms).toISOString()} (${ms} ms) · Randomness: ${normalized.slice(10)}`,
        };
      } catch {
        return { line, ok: false as const, detail: "Could not decode timestamp" };
      }
    });
  }, [validateInput]);

  const joined = ids.join("\n");

  return (
    <>
      <ToolHeader name={meta?.name ?? "ULID"} description={meta?.description ?? ""} slug="ulid" />
      <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        {(["generate", "validate"] as const).map((t) => (
          <Button
            key={t}
            type="button"
            variant={tab === t ? "primary" : "outline"}
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      {tab === "generate" ? (
        <div className="flex min-h-[20rem] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              Count
              <Input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                className="w-20"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={upper}
                onChange={(e) => setUpper(e.target.checked)}
                className="accent-emerald-500"
              />
              Uppercase
            </label>
            <Button type="button" onClick={generate}>
              Generate
            </Button>
          </div>
          <Panel
            title="ULIDs"
            actions={
              <>
                <CopyButton value={joined} />
                <DownloadButton value={joined} filename="ulids.txt" />
              </>
            }
          >
            <Textarea
              value={joined}
              readOnly
              className="min-h-[16rem] border-0 bg-zinc-950 p-0 font-mono text-emerald-300 focus:ring-0"
            />
          </Panel>
        </div>
      ) : (
        <div className="flex min-h-[20rem] flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <SampleButton onClick={() => setValidateInput(`${createUlid()}\nbad-ulid\n${createUlid().toLowerCase()}`)} />
            <ClearButton onClick={() => setValidateInput("")} />
          </div>
          <Panel title="ULIDs (one per line)">
            <Textarea
              value={validateInput}
              onChange={(e) => setValidateInput(e.target.value)}
              placeholder="Paste ULIDs to validate…"
              className="min-h-[10rem] border-0 bg-zinc-950 p-0 focus:ring-0"
            />
          </Panel>
          <Panel title="Results">
            {validations.length === 0 ? (
              <p className="text-sm text-zinc-500">Validation results appear here…</p>
            ) : (
              <ul className="space-y-2">
                {validations.map((row) => (
                  <li
                    key={row.line + row.detail}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm"
                  >
                    <p className={row.ok ? "text-emerald-300" : "text-rose-300"}>{row.line}</p>
                    <p className={`mt-1 text-xs ${row.ok ? "text-zinc-400" : "text-rose-400"}`}>
                      {row.ok ? `Valid · ${row.detail}` : row.detail}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

export function nanoid() {
  const meta = getToolBySlug("nanoid");
  const [ids, setIds] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [size, setSize] = useState(21);

  const generate = useCallback(() => {
    setIds(Array.from({ length: Math.min(50, Math.max(1, count)) }, () => createNanoid(size)));
  }, [count, size]);

  useEffect(() => {
    generate();
  }, []);

  return (
    <>
      <ToolHeader name={meta?.name ?? "Nano ID"} description={meta?.description ?? ""} slug="nanoid" />
      <div className="flex min-h-[20rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Count
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="w-20"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Size
            <Input
              type="number"
              min={8}
              max={64}
              value={size}
              onChange={(e) => setSize(Number(e.target.value) || 21)}
              className="w-20"
            />
          </label>
          <Button type="button" onClick={generate}>
            Generate
          </Button>
          <SampleButton
            label="Sample size 12"
            onClick={() => {
              setSize(12);
              setIds(Array.from({ length: 5 }, () => createNanoid(12)));
            }}
          />
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

const CRON_SAMPLES = ["0 9 * * 1-5", "*/5 * * * *", "0 0 1 * *", "0 12 * * 0"];

export function cron() {
  const meta = getToolBySlug("cron");
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
        next.push(interval.next().toDate().toString());
      }
      setOutput(`${human}\n\nNext 5 runs (local):\n${next.map((d, i) => `${i + 1}. ${d}`).join("\n")}`);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid cron expression");
      setOutput("");
    }
  }, [expr]);

  return (
    <>
      <ToolHeader name={meta?.name ?? "Cron Expression"} description={meta?.description ?? ""} slug="cron" />
      <TextIO
        input={expr}
        output={output}
        onInputChange={setExpr}
        onClear={() => setExpr("")}
        inputLabel="Cron expression"
        outputFilename="cron.txt"
        error={error}
        options={
          <div className="flex flex-wrap gap-2">
            {CRON_SAMPLES.map((s) => (
              <Button key={s} type="button" variant="outline" onClick={() => setExpr(s)}>
                {s}
              </Button>
            ))}
          </div>
        }
      />
    </>
  );
}

const TIMEZONES = [
  "UTC",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function partsInZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "long",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday,
  };
}

/** Build a Date that represents local wall time in `timeZone`. */
function zonedWallTimeToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string,
): Date {
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let utc = guess;
  for (let i = 0; i < 3; i++) {
    const asZone = partsInZone(new Date(utc), timeZone);
    const asUtcLike = Date.UTC(
      asZone.year,
      asZone.month - 1,
      asZone.day,
      asZone.hour,
      asZone.minute,
      asZone.second,
    );
    const desired = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    utc += desired - asUtcLike;
  }
  return new Date(utc);
}

function dayOfYear(date: Date, timeZone: string) {
  const p = partsInZone(date, timeZone);
  const start = zonedWallTimeToUtc({ year: p.year, month: 1, day: 1, hour: 0, minute: 0, second: 0 }, timeZone);
  const current = zonedWallTimeToUtc(
    { year: p.year, month: p.month, day: p.day, hour: 0, minute: 0, second: 0 },
    timeZone,
  );
  return Math.floor((current.getTime() - start.getTime()) / 86400000) + 1;
}

function isoWeek(date: Date, timeZone: string) {
  const p = partsInZone(date, timeZone);
  const utcDate = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function quarter(month: number) {
  return Math.floor((month - 1) / 3) + 1;
}

export function datetime() {
  const meta = getToolBySlug("datetime");
  const browserTz =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const defaultTz = TIMEZONES.includes("Asia/Jakarta")
    ? "Asia/Jakarta"
    : TIMEZONES.includes(browserTz)
      ? browserTz
      : "UTC";

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [ms, setMs] = useState(() => Date.now());
  const [tz, setTz] = useState(defaultTz);
  const [year, setYear] = useState(0);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [second, setSecond] = useState(0);
  const [source, setSource] = useState<"unix" | "cal">("unix");

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // Sync calendar fields from ms when unix-driven
  useEffect(() => {
    if (source !== "unix") return;
    const p = partsInZone(new Date(ms), tz);
    setYear(p.year);
    setMonth(p.month);
    setDay(p.day);
    setHour(p.hour);
    setMinute(p.minute);
    setSecond(p.second);
  }, [ms, tz, source]);

  // Sync ms from calendar when cal-driven
  useEffect(() => {
    if (source !== "cal") return;
    const d = zonedWallTimeToUtc({ year, month, day, hour, minute, second }, tz);
    if (!Number.isNaN(d.getTime())) setMs(d.getTime());
  }, [year, month, day, hour, minute, second, tz, source]);

  const date = useMemo(() => new Date(ms), [ms]);
  const metaParts = useMemo(() => {
    const p = partsInZone(date, tz);
    return {
      weekday: p.weekday,
      dayOfYear: dayOfYear(date, tz),
      week: isoWeek(date, tz),
      quarter: quarter(p.month),
    };
  }, [date, tz]);

  const formats = useMemo(() => {
    const iso = date.toISOString();
    const local = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      dateStyle: "full",
      timeStyle: "long",
    }).format(date);
    const rfc = date.toUTCString();
    const p = partsInZone(date, tz);
    const compact = `${p.year}${pad2(p.month)}${pad2(p.day)}T${pad2(p.hour)}${pad2(p.minute)}${pad2(p.second)}`;
    return [
      { label: "ISO-8601 (UTC)", value: iso },
      { label: `Locale (${tz})`, value: local },
      { label: "RFC 7231 (UTC)", value: rfc },
      { label: "Compact local", value: compact },
      { label: "Unix seconds", value: String(Math.floor(ms / 1000)) },
      { label: "Unix milliseconds", value: String(ms) },
    ];
  }, [date, tz, ms]);

  const setNow = () => {
    const n = Date.now();
    setSource("unix");
    setMs(n);
  };

  const field = (
    label: string,
    value: number,
    onChange: (n: number) => void,
    min?: number,
    max?: number,
  ) => (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          setSource("cal");
          onChange(Number(e.target.value));
        }}
        className="w-full"
      />
    </label>
  );

  return (
    <>
      <ToolHeader name={meta?.name ?? "Date and Time"} description={meta?.description ?? ""} slug="datetime" />
      <div className="flex flex-col gap-4">
        <Panel title="Now">
          <div className="flex flex-wrap gap-6 font-mono text-sm">
            <div>
              <p className="text-xs text-zinc-500">Unix seconds</p>
              <div className="flex items-center gap-2">
                <p className="text-emerald-300">{Math.floor(nowMs / 1000)}</p>
                <CopyButton value={String(Math.floor(nowMs / 1000))} />
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Unix milliseconds</p>
              <div className="flex items-center gap-2">
                <p className="text-emerald-300">{nowMs}</p>
                <CopyButton value={String(nowMs)} />
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="Unix timestamp">
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Seconds
                <Input
                  type="number"
                  value={Math.floor(ms / 1000)}
                  onChange={(e) => {
                    setSource("unix");
                    const sec = Number(e.target.value);
                    if (!Number.isNaN(sec)) setMs(sec * 1000 + (ms % 1000));
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Milliseconds
                <Input
                  type="number"
                  value={ms}
                  onChange={(e) => {
                    setSource("unix");
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) setMs(v);
                  }}
                />
              </label>
              <Button type="button" onClick={setNow}>
                Set to now
              </Button>
            </div>
          </Panel>

          <Panel title="Calendar">
            <div className="mb-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Timezone
                <select
                  value={tz}
                  onChange={(e) => {
                    setSource("unix");
                    setTz(e.target.value);
                  }}
                  className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
                >
                  {[...new Set([browserTz, ...TIMEZONES])].map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {field("Year", year, setYear, 1970, 2100)}
              {field("Month", month, setMonth, 1, 12)}
              {field("Day", day, setDay, 1, 31)}
              {field("Hour", hour, setHour, 0, 23)}
              {field("Minute", minute, setMinute, 0, 59)}
              {field("Second", second, setSecond, 0, 59)}
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              {metaParts.weekday} · day {metaParts.dayOfYear} · week {metaParts.week} · Q
              {metaParts.quarter}
            </p>
          </Panel>
        </div>

        <Panel title="Formatted">
          <ul className="space-y-2">
            {formats.map((f) => (
              <li
                key={f.label}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">{f.label}</p>
                  <p className="truncate font-mono text-sm text-zinc-100">{f.value}</p>
                </div>
                <CopyButton value={f.value} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
