"use client";

import ipaddr from "ipaddr.js";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  Panel,
  SampleButton,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";

const CIDR_SAMPLE = "192.168.1.0/24";

type CidrInfo = {
  kind: "ipv4" | "ipv6";
  network: string;
  broadcast: string;
  netmask: string;
  firstUsable: string;
  lastUsable: string;
  hostCount: number;
  prefix: number;
};

function calcCidr(input: string): CidrInfo {
  const trimmed = input.trim();
  if (!ipaddr.isValidCIDR(trimmed)) throw new Error("Invalid CIDR notation");

  const [, prefix] = ipaddr.parseCIDR(trimmed);

  if (ipaddr.IPv4.isValidCIDR(trimmed)) {
    const network = ipaddr.IPv4.networkAddressFromCIDR(trimmed);
    const broadcast = ipaddr.IPv4.broadcastAddressFromCIDR(trimmed);
    const netmask = ipaddr.IPv4.subnetMaskFromPrefixLength(prefix);
    const total = 2 ** (32 - prefix);
    let firstUsable = network.toString();
    let lastUsable = broadcast.toString();
    let hostCount = total;
    if (prefix <= 30) {
      const netOctets = [...network.octets];
      const bcastOctets = [...broadcast.octets];
      netOctets[3] = (netOctets[3]! + 1) & 0xff;
      bcastOctets[3] = (bcastOctets[3]! - 1) & 0xff;
      firstUsable = new ipaddr.IPv4(netOctets).toString();
      lastUsable = new ipaddr.IPv4(bcastOctets).toString();
      hostCount = total - 2;
    } else if (prefix === 31) {
      hostCount = 2;
    } else {
      hostCount = 1;
    }
    return {
      kind: "ipv4",
      network: network.toString(),
      broadcast: broadcast.toString(),
      netmask: netmask.toString(),
      firstUsable,
      lastUsable,
      hostCount,
      prefix,
    };
  }

  const network = ipaddr.IPv6.networkAddressFromCIDR(trimmed);
  const broadcast = ipaddr.IPv6.broadcastAddressFromCIDR(trimmed);
  const netmask = ipaddr.IPv6.subnetMaskFromPrefixLength(prefix);
  const hostBits = 128 - prefix;
  const hostCount = hostBits >= 63 ? Number.MAX_SAFE_INTEGER : 2 ** hostBits;

  return {
    kind: "ipv6",
    network: network.toRFC5952String(),
    broadcast: broadcast.toRFC5952String(),
    netmask: netmask.toRFC5952String(),
    firstUsable: network.toRFC5952String(),
    lastUsable: broadcast.toRFC5952String(),
    hostCount,
    prefix,
  };
}

type ChmodBits = {
  owner: { r: boolean; w: boolean; x: boolean };
  group: { r: boolean; w: boolean; x: boolean };
  other: { r: boolean; w: boolean; x: boolean };
};

const DEFAULT_BITS: ChmodBits = {
  owner: { r: true, w: true, x: true },
  group: { r: true, w: false, x: true },
  other: { r: true, w: false, x: true },
};

function tripletToDigit(t: { r: boolean; w: boolean; x: boolean }): number {
  return (t.r ? 4 : 0) + (t.w ? 2 : 0) + (t.x ? 1 : 0);
}

function digitToTriplet(d: number): { r: boolean; w: boolean; x: boolean } {
  const n = Math.max(0, Math.min(7, d));
  return { r: (n & 4) !== 0, w: (n & 2) !== 0, x: (n & 1) !== 0 };
}

function bitsToOctal(bits: ChmodBits): string {
  return `${tripletToDigit(bits.owner)}${tripletToDigit(bits.group)}${tripletToDigit(bits.other)}`;
}

function bitsToSymbolic(bits: ChmodBits): string {
  const fmt = (t: { r: boolean; w: boolean; x: boolean }) =>
    `${t.r ? "r" : "-"}${t.w ? "w" : "-"}${t.x ? "x" : "-"}`;
  return `${fmt(bits.owner)}${fmt(bits.group)}${fmt(bits.other)}`;
}

function octalToBits(octal: string): ChmodBits | null {
  const cleaned = octal.replace(/^0o/i, "").trim();
  if (!/^[0-7]{3,4}$/.test(cleaned)) return null;
  const digits = cleaned.slice(-3);
  return {
    owner: digitToTriplet(Number(digits[0])),
    group: digitToTriplet(Number(digits[1])),
    other: digitToTriplet(Number(digits[2])),
  };
}

function BitCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-emerald-500"
      />
      {label}
    </label>
  );
}

export function cidrCalculator() {
  const meta = getToolBySlug("cidr-calculator");
  const [input, setInput] = useState(CIDR_SAMPLE);

  const { info, error } = useMemo(() => {
    if (!input.trim()) return { info: null as CidrInfo | null, error: null as string | null };
    try {
      return { info: calcCidr(input), error: null };
    } catch (e) {
      return {
        info: null,
        error: e instanceof Error ? e.message : "Calculation failed",
      };
    }
  }, [input]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "CIDR Calculator"}
        description={meta?.description ?? "Compute network, broadcast, and host ranges from CIDR."}
        slug="cidr-calculator"
      />
      <div className="flex min-h-[24rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="192.168.1.0/24"
            className="max-w-md flex-1 font-mono"
          />
          <SampleButton onClick={() => setInput(CIDR_SAMPLE)} />
          <ClearButton onClick={() => setInput("")} />
        </div>
        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        {info ? (
          <Panel title="Subnet details">
            <dl className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["Address family", info.kind.toUpperCase()],
                  ["Prefix length", `/${info.prefix}`],
                  ["Network", info.network],
                  ["Broadcast", info.broadcast],
                  ["Netmask", info.netmask],
                  ["First usable", info.firstUsable],
                  ["Last usable", info.lastUsable],
                  [
                    "Host count",
                    info.hostCount >= Number.MAX_SAFE_INTEGER
                      ? "Very large (IPv6)"
                      : info.hostCount.toLocaleString(),
                  ],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
                  <dd className="mt-1 break-all font-mono text-sm text-zinc-200">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ) : null}
      </div>
    </>
  );
}

export function chmodCalculator() {
  const meta = getToolBySlug("chmod-calculator");
  const [bits, setBits] = useState<ChmodBits>(DEFAULT_BITS);
  const [octalInput, setOctalInput] = useState("755");
  const [octalError, setOctalError] = useState<string | null>(null);

  const octal = bitsToOctal(bits);
  const symbolic = bitsToSymbolic(bits);

  const setTriplet = (
    who: keyof ChmodBits,
    perm: "r" | "w" | "x",
    value: boolean,
  ) => {
    setBits((prev) => {
      const next = { ...prev, [who]: { ...prev[who], [perm]: value } };
      setOctalInput(bitsToOctal(next));
      return next;
    });
    setOctalError(null);
  };

  const applyOctal = (value: string) => {
    setOctalInput(value);
    const parsed = octalToBits(value);
    if (!parsed) {
      setOctalError("Enter 3 octal digits (0–7), e.g. 755");
      return;
    }
    setBits(parsed);
    setOctalError(null);
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "chmod Calculator"}
        description={meta?.description ?? "Convert between octal and symbolic Unix permissions."}
        slug="chmod-calculator"
      />
      <div className="flex min-h-[24rem] flex-col gap-3">
        <Panel title="Symbolic (ugo rwx)">
          {(["owner", "group", "other"] as const).map((who) => (
            <div key={who} className="mb-4 last:mb-0">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {who}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["r", "w", "x"] as const).map((perm) => (
                  <BitCheckbox
                    key={perm}
                    label={perm}
                    checked={bits[who][perm]}
                    onChange={(v) => setTriplet(who, perm, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </Panel>
        <Panel title="Octal">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={octalInput}
              onChange={(e) => applyOctal(e.target.value)}
              placeholder="755"
              className="max-w-[8rem] font-mono text-lg"
              maxLength={4}
            />
            <SampleButton
              onClick={() => {
                setBits(DEFAULT_BITS);
                setOctalInput("755");
                setOctalError(null);
              }}
            />
          </div>
          {octalError ? (
            <p className="mt-2 text-sm text-rose-300">{octalError}</p>
          ) : null}
        </Panel>
        <Panel title="Result" actions={<CopyButton value={`${octal} (${symbolic})`} />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Octal</dt>
              <dd className="mt-2 font-mono text-3xl font-semibold text-emerald-300">{octal}</dd>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Symbolic</dt>
              <dd className="mt-2 font-mono text-3xl font-semibold text-emerald-300">{symbolic}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-zinc-500">
            Example: <code className="text-zinc-300">chmod {octal} file.txt</code>
          </p>
        </Panel>
      </div>
    </>
  );
}
