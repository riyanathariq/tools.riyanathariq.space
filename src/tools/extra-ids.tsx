"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  Panel,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";

const TIMEZONE_OPTIONS = [
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

const DEFAULT_ZONES = ["Asia/Jakarta", "UTC", "America/New_York"] as const;

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
    weekday: "short",
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

function zonedWallTimeToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string,
): Date {
  let utc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
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

function formatInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false,
  }).format(date);
}

function offsetLabel(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  const utcMs = zonedWallTimeToUtc(
    { year: parts.year, month: parts.month, day: parts.day, hour: 12, minute: 0, second: 0 },
    timeZone,
  ).getTime();
  const utcNoon = Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0);
  const offsetMin = Math.round((utcNoon - utcMs) / 60000);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return `UTC${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

export function timezonePlanner() {
  const meta = getToolBySlug("timezone-planner");
  const browserTz =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const [baseZone, setBaseZone] = useState<string>("Asia/Jakarta");
  const [zones, setZones] = useState<string[]>([...DEFAULT_ZONES]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [day, setDay] = useState(() => new Date().getDate());
  const [hour, setHour] = useState(() => new Date().getHours());
  const [minute, setMinute] = useState(() => new Date().getMinutes());

  const instant = useMemo(() => {
    return zonedWallTimeToUtc(
      { year, month, day, hour, minute, second: 0 },
      baseZone,
    );
  }, [year, month, day, hour, minute, baseZone]);

  const rows = useMemo(() => {
    return zones.map((tz) => ({
      tz,
      formatted: formatInZone(instant, tz),
      offset: offsetLabel(instant, tz),
      weekday: partsInZone(instant, tz).weekday,
    }));
  }, [instant, zones]);

  const addZone = (tz: string) => {
    if (zones.includes(tz) || zones.length >= 4) return;
    setZones([...zones, tz]);
  };

  const removeZone = (tz: string) => {
    if (zones.length <= 2) return;
    setZones(zones.filter((z) => z !== tz));
  };

  const setNow = () => {
    const now = new Date();
    const p = partsInZone(now, baseZone);
    setYear(p.year);
    setMonth(p.month);
    setDay(p.day);
    setHour(p.hour);
    setMinute(p.minute);
  };

  const availableToAdd = TIMEZONE_OPTIONS.filter((z) => !zones.includes(z));

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Timezone Planner"}
        description={meta?.description ?? "Compare a moment across multiple IANA timezones."}
        slug="timezone-planner"
      />
      <div className="flex flex-col gap-4">
        <Panel title="Base datetime">
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Base timezone
              <select
                value={baseZone}
                onChange={(e) => setBaseZone(e.target.value)}
                className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
              >
                {[...new Set([browserTz, ...TIMEZONE_OPTIONS])].map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button type="button" onClick={setNow}>
                Set to now
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                ["Year", year, setYear, 1970, 2100],
                ["Month", month, setMonth, 1, 12],
                ["Day", day, setDay, 1, 31],
                ["Hour", hour, setHour, 0, 23],
                ["Minute", minute, setMinute, 0, 59],
              ] as const
            ).map(([label, value, setter, min, max]) => (
              <label key={label} className="flex flex-col gap-1 text-xs text-zinc-500">
                {label}
                <Input
                  type="number"
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => setter(Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Interpreting {pad2(hour)}:{pad2(minute)} on {year}-{pad2(month)}-{pad2(day)} in{" "}
            <span className="font-mono text-zinc-400">{baseZone}</span>
          </p>
        </Panel>

        <Panel title="Compared timezones (2–4)">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {zones.length < 4 && availableToAdd.length ? (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) addZone(e.target.value);
                  e.target.value = "";
                }}
                className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
              >
                <option value="">Add timezone…</option>
                {availableToAdd.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="text-xs text-zinc-500">{zones.length}/4 selected</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase">
                  <th className="px-3 py-2 font-medium">Timezone</th>
                  <th className="px-3 py-2 font-medium">Local time</th>
                  <th className="px-3 py-2 font-medium">Offset</th>
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.tz} className="border-b border-zinc-800/80">
                    <td className="px-3 py-2.5 font-mono text-zinc-200">{row.tz}</td>
                    <td className="px-3 py-2.5 text-emerald-300">{row.formatted}</td>
                    <td className="px-3 py-2.5 font-mono text-zinc-400">{row.offset}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{row.weekday}</td>
                    <td className="px-3 py-2.5">
                      {zones.length > 2 ? (
                        <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => removeZone(row.tz)}>
                          Remove
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
