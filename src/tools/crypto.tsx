"use client";

import { importSPKI, jwtVerify, SignJWT } from "jose";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { cn } from "@/lib/utils";

const JWT_SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2HT4F6DfMuqBE1-7jCp1Aas2T6DY";
const JWT_SAMPLE_SECRET = "your-256-bit-secret";

const HASH_SAMPLES = ["hello", "The quick brown fox jumps over the lazy dog"];
const HMAC_SAMPLES = [
  { message: "hello world", key: "secret" },
  { message: "test", key: "key123" },
];

type OutputFormat = "hex" | "base64";
type HashAlg = "SHA-256" | "SHA-384" | "SHA-512" | "MD5";
type HmacAlg = "HS256" | "HS384" | "HS512";
type JwtTab = "decoder" | "encoder";
type JwtEncoderAlg = "HS256" | "HS384" | "HS512";
type KeyTab = "rsa" | "ecdsa" | "ed25519";
type VerifyStatus = "verified" | "failed" | "skipped";

function hexFromBuffer(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBase64(hex: string): string {
  const bytes = hex.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? [];
  return btoa(String.fromCharCode(...bytes));
}

function formatDigest(hex: string, format: OutputFormat): string {
  return format === "hex" ? hex : hexToBase64(hex);
}

async function shaHash(alg: "SHA-256" | "SHA-384" | "SHA-512", text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest(alg, data);
  return hexFromBuffer(hash);
}

function md5(input: string): string {
  function rotateLeft(x: number, n: number) {
    return (x << n) | (x >>> (32 - n));
  }
  function toWords(str: string) {
    const bytes = new TextEncoder().encode(str);
    const bitLen = bytes.length * 8;
    const words: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
      words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    }
    words[bitLen >> 5] |= 0x80 << bitLen % 32;
    words[(((bitLen + 64) >>> 9) << 4) + 14] = bitLen;
    return words;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return (rotateLeft((a + ((b & c) | (~b & d)) + x + t) | 0, s) + b) | 0;
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return (rotateLeft((a + ((b & d) | (c & ~d)) + x + t) | 0, s) + b) | 0;
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return (rotateLeft((a + (b ^ c ^ d) + x + t) | 0, s) + b) | 0;
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return (rotateLeft((a + (c ^ (b | ~d)) + x + t) | 0, s) + b) | 0;
  }
  const x = toWords(input);
  let a = 0x67452301,
    b = 0xefcdab89,
    c = 0x98badcfe,
    d = 0x10325476;
  for (let i = 0; i < x.length; i += 16) {
    const oa = a,
      ob = b,
      oc = c,
      od = d;
    a = ff(a, b, c, d, x[i], 7, -680876936);
    d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063);
    b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = gg(b, c, d, a, x[i], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, x[i + 5], 4, -378558);
    d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = hh(d, a, b, c, x[i], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = ii(a, b, c, d, x[i], 6, -198630844);
    d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = (a + oa) | 0;
    b = (b + ob) | 0;
    c = (c + oc) | 0;
    d = (d + od) | 0;
  }
  return [a, b, c, d].map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("");
}

async function hmacDigest(
  alg: HmacAlg,
  key: string,
  message: string,
): Promise<string> {
  const hashMap: Record<HmacAlg, "SHA-256" | "SHA-384" | "SHA-512"> = {
    HS256: "SHA-256",
    HS384: "SHA-384",
    HS512: "SHA-512",
  };
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: hashMap[alg] },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return hexFromBuffer(sig);
}

function pemFromBuffer(label: string, buf: ArrayBuffer): string {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

function decodeBase64Url(part: string): string {
  const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

function parseJwtParts(token: string) {
  const parts = token.trim().split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format (expected 3 parts)");
  const header = JSON.parse(decodeBase64Url(parts[0])) as Record<string, unknown>;
  const payload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
  return { parts, header, payload };
}

function formatUnixTime(sec: number): string {
  return new Date(sec * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "ok" | "warn" | "bad" | "neutral";
}) {
  const tones = {
    ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    bad: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    neutral: "border-zinc-600 bg-zinc-900 text-zinc-400",
  };
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {label}
    </span>
  );
}

function TimeClaims({ payload }: { payload: Record<string, unknown> }) {
  const now = Math.floor(Date.now() / 1000);
  const claims: { key: string; label: string; badge?: string; tone?: "ok" | "warn" | "bad" }[] = [];

  for (const key of ["iat", "nbf", "exp"] as const) {
    const raw = payload[key];
    if (typeof raw !== "number") continue;
    const label = `${key.toUpperCase()}: ${formatUnixTime(raw)} (${raw})`;
    if (key === "exp" && raw < now) {
      claims.push({ key, label, badge: "Expired", tone: "bad" });
    } else if (key === "nbf" && raw > now) {
      claims.push({ key, label, badge: "Not yet valid", tone: "warn" });
    } else if (key === "exp" && raw >= now) {
      claims.push({ key, label, badge: "Valid", tone: "ok" });
    } else {
      claims.push({ key, label });
    }
  }

  if (!claims.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {claims.map((c) => (
        <div
          key={c.key}
          className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300"
        >
          <span className="font-mono">{c.label}</span>
          {c.badge ? <StatusChip label={c.badge} tone={c.tone ?? "neutral"} /> : null}
        </div>
      ))}
    </div>
  );
}

export function hashing() {
  const meta = getToolBySlug("hashing");
  const [input, setInput] = useState("");
  const [alg, setAlg] = useState<HashAlg>("SHA-256");
  const [format, setFormat] = useState<OutputFormat>("hex");
  const [rawHex, setRawHex] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input) {
      setRawHex("");
      setError(null);
      return;
    }
    (async () => {
      try {
        const hex = alg === "MD5" ? md5(input) : await shaHash(alg, input);
        setRawHex(hex);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Hash failed");
        setRawHex("");
      }
    })();
  }, [input, alg]);

  const output = rawHex ? formatDigest(rawHex, format) : "";

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Hashing"}
        description={meta?.description ?? ""}
        slug="hashing"
      />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        outputFilename="hash.txt"
        error={error}
        options={
          <div className="flex flex-wrap items-center gap-2">
            {(["SHA-256", "SHA-384", "SHA-512", "MD5"] as const).map((a) => (
              <Button
                key={a}
                type="button"
                variant={alg === a ? "primary" : "outline"}
                onClick={() => setAlg(a)}
              >
                {a === "MD5" ? "MD5 (legacy)" : a}
              </Button>
            ))}
            <span className="mx-1 h-5 w-px bg-zinc-700" />
            {(["hex", "base64"] as const).map((f) => (
              <Button
                key={f}
                type="button"
                variant={format === f ? "primary" : "outline"}
                onClick={() => setFormat(f)}
              >
                {f}
              </Button>
            ))}
            {HASH_SAMPLES.map((s) => (
              <SampleButton key={s} label={s.slice(0, 12) + (s.length > 12 ? "…" : "")} onClick={() => setInput(s)} />
            ))}
          </div>
        }
      />
    </>
  );
}

export function hmac() {
  const meta = getToolBySlug("hmac");
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [alg, setAlg] = useState<HmacAlg>("HS256");
  const [format, setFormat] = useState<OutputFormat>("hex");
  const [rawHex, setRawHex] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input || !key) {
      setRawHex("");
      setError(null);
      return;
    }
    hmacDigest(alg, key, input)
      .then((h) => {
        setRawHex(h);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "HMAC failed");
        setRawHex("");
      });
  }, [input, key, alg]);

  const output = rawHex ? formatDigest(rawHex, format) : "";

  return (
    <>
      <ToolHeader name={meta?.name ?? "HMAC"} description={meta?.description ?? ""} slug="hmac" />
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <label className="text-sm text-zinc-400">Secret key</label>
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter secret key…"
          className="max-w-md flex-1"
        />
        {(["HS256", "HS384", "HS512"] as const).map((a) => (
          <Button
            key={a}
            type="button"
            variant={alg === a ? "primary" : "outline"}
            onClick={() => setAlg(a)}
          >
            {a}
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-zinc-700" />
        {(["hex", "base64"] as const).map((f) => (
          <Button
            key={f}
            type="button"
            variant={format === f ? "primary" : "outline"}
            onClick={() => setFormat(f)}
          >
            {f}
          </Button>
        ))}
        {HMAC_SAMPLES.map((s) => (
          <SampleButton
            key={s.message}
            label={s.message}
            onClick={() => {
              setInput(s.message);
              setKey(s.key);
            }}
          />
        ))}
      </div>
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        inputLabel="Message"
        outputFilename="hmac.txt"
        error={error}
      />
    </>
  );
}

const DEFAULT_ENCODER_PAYLOAD = `{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022
}`;

export function jwt() {
  const meta = getToolBySlug("jwt");
  const [tab, setTab] = useState<JwtTab>("decoder");

  // Decoder state
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [headerJson, setHeaderJson] = useState("");
  const [payloadJson, setPayloadJson] = useState("");
  const [payloadObj, setPayloadObj] = useState<Record<string, unknown> | null>(null);
  const [headerAlg, setHeaderAlg] = useState<string | null>(null);
  const [structureValid, setStructureValid] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("skipped");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Encoder state
  const [encAlg, setEncAlg] = useState<JwtEncoderAlg>("HS256");
  const [encSecret, setEncSecret] = useState("");
  const [encPayload, setEncPayload] = useState(DEFAULT_ENCODER_PAYLOAD);
  const [encodedToken, setEncodedToken] = useState("");
  const [encodeError, setEncodeError] = useState<string | null>(null);
  const [encoding, setEncoding] = useState(false);

  useEffect(() => {
    const trimmed = token.trim();
    if (!trimmed) {
      setDecodeError(null);
      setHeaderJson("");
      setPayloadJson("");
      setPayloadObj(null);
      setHeaderAlg(null);
      setStructureValid(false);
      setVerifyStatus("skipped");
      setVerifyError(null);
      return;
    }

    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;
    try {
      ({ header, payload } = parseJwtParts(trimmed));
      setHeaderJson(JSON.stringify(header, null, 2));
      setPayloadJson(JSON.stringify(payload, null, 2));
      setPayloadObj(payload);
      setHeaderAlg(typeof header.alg === "string" ? header.alg : null);
      setStructureValid(true);
      setDecodeError(null);
    } catch (e) {
      setDecodeError(e instanceof Error ? e.message : "JWT decode failed");
      setHeaderJson("");
      setPayloadJson("");
      setPayloadObj(null);
      setHeaderAlg(null);
      setStructureValid(false);
      setVerifyStatus("skipped");
      setVerifyError(null);
      return;
    }

    const alg = typeof header.alg === "string" ? header.alg : "";
    const hmacAlgs = ["HS256", "HS384", "HS512"];
    const asymAlgs = ["RS256", "ES256"];
    const hasSecret = secret.trim().length > 0;
    const hasPublicKey = publicKey.trim().length > 0;

    if (hmacAlgs.includes(alg) && hasSecret) {
      (async () => {
        try {
          await jwtVerify(trimmed, new TextEncoder().encode(secret.trim()), {
            algorithms: [alg as JwtEncoderAlg],
          });
          setVerifyStatus("verified");
          setVerifyError(null);
        } catch (e) {
          setVerifyStatus("failed");
          setVerifyError(e instanceof Error ? e.message : "Verification failed");
        }
      })();
    } else if (asymAlgs.includes(alg) && hasPublicKey) {
      (async () => {
        try {
          const key = await importSPKI(publicKey.trim(), alg);
          await jwtVerify(trimmed, key, { algorithms: [alg] });
          setVerifyStatus("verified");
          setVerifyError(null);
        } catch (e) {
          setVerifyStatus("failed");
          setVerifyError(e instanceof Error ? e.message : "Verification failed");
        }
      })();
    } else {
      setVerifyStatus("skipped");
      setVerifyError(null);
    }
  }, [token, secret, publicKey]);

  const signToken = useCallback(async () => {
    setEncoding(true);
    setEncodeError(null);
    try {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(encPayload) as Record<string, unknown>;
      } catch {
        throw new Error("Payload must be valid JSON");
      }
      if (!encSecret.trim()) throw new Error("Secret is required for signing");
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: encAlg, typ: "JWT" })
        .sign(new TextEncoder().encode(encSecret.trim()));
      setEncodedToken(jwt);
    } catch (e) {
      setEncodeError(e instanceof Error ? e.message : "Encoding failed");
      setEncodedToken("");
    } finally {
      setEncoding(false);
    }
  }, [encAlg, encSecret, encPayload]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "JSON Web Token (JWT)"}
        description={meta?.description ?? ""}
        slug="jwt"
      />
      <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        {(["decoder", "encoder"] as const).map((t) => (
          <Button
            key={t}
            type="button"
            variant={tab === t ? "primary" : "outline"}
            onClick={() => setTab(t)}
          >
            {t === "decoder" ? "Decoder" : "Encoder"}
          </Button>
        ))}
      </div>

      {tab === "decoder" ? (
        <div className="flex min-h-[28rem] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip
              label={structureValid ? "Valid structure" : token.trim() ? "Invalid structure" : "No token"}
              tone={structureValid ? "ok" : token.trim() ? "bad" : "neutral"}
            />
            {headerAlg ? <StatusChip label={`alg: ${headerAlg}`} tone="neutral" /> : null}
            {verifyStatus === "verified" ? (
              <StatusChip label="Signature verified" tone="ok" />
            ) : verifyStatus === "failed" ? (
              <StatusChip label="Signature failed" tone="bad" />
            ) : structureValid ? (
              <StatusChip label="Signature skipped" tone="neutral" />
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1 block text-xs text-zinc-500">HMAC secret (HS256/384/512)</label>
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Optional HMAC secret…"
                type="password"
              />
            </div>
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1 block text-xs text-zinc-500">Public key PEM (RS256/ES256)</label>
              <Input
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Optional SPKI public key…"
                className="font-mono text-xs"
              />
            </div>
            <SampleButton
              label="Sample JWT"
              onClick={() => {
                setToken(JWT_SAMPLE);
                setSecret(JWT_SAMPLE_SECRET);
              }}
            />
          </div>

          {decodeError ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {decodeError}
            </p>
          ) : null}
          {verifyError && verifyStatus === "failed" ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              {verifyError}
            </p>
          ) : null}

          <Panel title="Encoded JWT" actions={<ClearButton onClick={() => setToken("")} />}>
            <Textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste encoded JWT…"
              className="min-h-[6rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
            />
          </Panel>

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
            <Panel title="Header" actions={headerJson ? <CopyButton value={headerJson} /> : undefined}>
              <Textarea
                value={headerJson}
                readOnly
                placeholder="Header JSON…"
                className="min-h-[12rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
              />
            </Panel>
            <Panel
              title="Payload"
              actions={payloadJson ? <CopyButton value={payloadJson} /> : undefined}
            >
              <Textarea
                value={payloadJson}
                readOnly
                placeholder="Payload JSON…"
                className="min-h-[12rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
              />
              {payloadObj ? <TimeClaims payload={payloadObj} /> : null}
            </Panel>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[28rem] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            {(["HS256", "HS384", "HS512"] as const).map((a) => (
              <Button
                key={a}
                type="button"
                variant={encAlg === a ? "primary" : "outline"}
                onClick={() => setEncAlg(a)}
              >
                {a}
              </Button>
            ))}
            <label className="flex flex-1 items-center gap-2 text-sm text-zinc-400">
              Secret
              <Input
                value={encSecret}
                onChange={(e) => setEncSecret(e.target.value)}
                placeholder="Signing secret…"
                type="password"
                className="max-w-md"
              />
            </label>
            <Button type="button" onClick={signToken} disabled={encoding}>
              {encoding ? "Signing…" : "Sign JWT"}
            </Button>
          </div>

          {encodeError ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {encodeError}
            </p>
          ) : null}

          <Panel title="Payload (JSON)" actions={<ClearButton onClick={() => setEncPayload("")} />}>
            <Textarea
              value={encPayload}
              onChange={(e) => setEncPayload(e.target.value)}
              placeholder='{ "sub": "1234567890" }'
              className="min-h-[12rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
            />
          </Panel>

          <Panel
            title="Encoded JWT"
            actions={encodedToken ? <CopyButton value={encodedToken} /> : undefined}
          >
            <Textarea
              value={encodedToken}
              readOnly
              placeholder="Signed token appears here…"
              className="min-h-[6rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
            />
          </Panel>
        </div>
      )}
    </>
  );
}

export function keyGenerator() {
  const meta = getToolBySlug("key-generator");
  const [tab, setTab] = useState<KeyTab>("rsa");
  const [rsaSize, setRsaSize] = useState<2048 | 4096>(2048);
  const [publicPem, setPublicPem] = useState("");
  const [privatePem, setPrivatePem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let pub = "";
      let priv = "";
      if (tab === "rsa") {
        const pair = await crypto.subtle.generateKey(
          {
            name: "RSA-OAEP",
            modulusLength: rsaSize,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
          },
          true,
          ["encrypt", "decrypt"],
        );
        const pubBuf = await crypto.subtle.exportKey("spki", pair.publicKey);
        const privBuf = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
        pub = pemFromBuffer("PUBLIC KEY", pubBuf);
        priv = pemFromBuffer("PRIVATE KEY", privBuf);
      } else if (tab === "ecdsa") {
        const pair = await crypto.subtle.generateKey(
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["sign", "verify"],
        );
        const pubBuf = await crypto.subtle.exportKey("spki", pair.publicKey);
        const privBuf = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
        pub = pemFromBuffer("PUBLIC KEY", pubBuf);
        priv = pemFromBuffer("PRIVATE KEY", privBuf);
      } else {
        const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
        const pubBuf = await crypto.subtle.exportKey("spki", pair.publicKey);
        const privBuf = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
        pub = pemFromBuffer("PUBLIC KEY", pubBuf);
        priv = pemFromBuffer("PRIVATE KEY", privBuf);
      }
      setPublicPem(pub);
      setPrivatePem(priv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Key generation failed");
      setPublicPem("");
      setPrivatePem("");
    } finally {
      setLoading(false);
    }
  }, [tab, rsaSize]);

  const tabLabel: Record<KeyTab, string> = {
    rsa: "RSA",
    ecdsa: "ECDSA (P-256)",
    ed25519: "Ed25519",
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Key Generator"}
        description={meta?.description ?? ""}
        slug="key-generator"
      />
      <div className="flex min-h-[28rem] flex-col gap-3">
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Keys are generated locally in your browser and never leave this device. Do not use
          browser-generated keys for production secrets without proper review.
        </p>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          {(["rsa", "ecdsa", "ed25519"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={tab === t ? "primary" : "outline"}
              onClick={() => setTab(t)}
            >
              {tabLabel[t]}
            </Button>
          ))}
          {tab === "rsa" ? (
            <>
              {([2048, 4096] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={rsaSize === s ? "primary" : "outline"}
                  onClick={() => setRsaSize(s)}
                >
                  {s}-bit
                </Button>
              ))}
              <span className="text-xs text-zinc-500">RSA-OAEP · SHA-256</span>
            </>
          ) : null}
          <Button type="button" onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate keys"}
          </Button>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <Panel
            title="Public key (SPKI)"
            actions={
              publicPem ? (
                <>
                  <CopyButton value={publicPem} />
                  <DownloadButton value={publicPem} filename="public.pem" />
                </>
              ) : undefined
            }
          >
            <Textarea
              value={publicPem}
              readOnly
              placeholder="Public PEM appears here…"
              className="min-h-[16rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
            />
          </Panel>
          <Panel
            title="Private key (PKCS#8)"
            actions={
              privatePem ? (
                <>
                  <CopyButton value={privatePem} />
                  <DownloadButton value={privatePem} filename="private.pem" />
                </>
              ) : undefined
            }
          >
            <Textarea
              value={privatePem}
              readOnly
              placeholder="Private PEM appears here…"
              className="min-h-[16rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?",
};
const AMBIGUOUS = new Set(["0", "O", "1", "l", "I"]);

function stripAmbiguous(pool: string): string {
  return [...pool].filter((c) => !AMBIGUOUS.has(c)).join("");
}

type StrengthLevel = "weak" | "fair" | "good" | "strong";

function passwordStrength(
  password: string,
  opts: { useLower: boolean; useUpper: boolean; useDigits: boolean; useSymbols: boolean },
): { level: StrengthLevel; score: number; max: number } {
  let score = 0;
  const max = 100;
  if (password.length >= 8) score += 15;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  if (password.length >= 24) score += 10;
  if (opts.useLower && /[a-z]/.test(password)) score += 12;
  if (opts.useUpper && /[A-Z]/.test(password)) score += 12;
  if (opts.useDigits && /\d/.test(password)) score += 12;
  if (opts.useSymbols && /[^a-zA-Z0-9]/.test(password)) score += 14;
  const unique = new Set(password).size;
  if (unique >= password.length * 0.6) score += 10;

  let level: StrengthLevel = "weak";
  if (score >= 75) level = "strong";
  else if (score >= 55) level = "good";
  else if (score >= 35) level = "fair";

  return { level, score: Math.min(score, max), max };
}

const STRENGTH_COLORS: Record<StrengthLevel, string> = {
  weak: "bg-rose-500",
  fair: "bg-amber-500",
  good: "bg-emerald-400",
  strong: "bg-emerald-500",
};

export function passwordGenerator() {
  const meta = getToolBySlug("password-generator");
  const [length, setLength] = useState(20);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [password, setPassword] = useState("");

  const generate = useCallback(() => {
    let pool = "";
    if (useLower) pool += CHARSETS.lower;
    if (useUpper) pool += CHARSETS.upper;
    if (useDigits) pool += CHARSETS.digits;
    if (useSymbols) pool += CHARSETS.symbols;
    if (excludeAmbiguous) pool = stripAmbiguous(pool);
    if (!pool) {
      setPassword("");
      return;
    }
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    setPassword(Array.from(arr, (n) => pool[n % pool.length]).join(""));
  }, [length, useLower, useUpper, useDigits, useSymbols, excludeAmbiguous]);

  useEffect(() => {
    generate();
  }, [generate]);

  const strength = useMemo(
    () =>
      passwordStrength(password, {
        useLower,
        useUpper,
        useDigits,
        useSymbols,
      }),
    [password, useLower, useUpper, useDigits, useSymbols],
  );

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Password Generator"}
        description={meta?.description ?? ""}
        slug="password-generator"
      />
      <div className="flex min-h-[20rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Length
            <Input
              type="number"
              min={4}
              max={128}
              value={length}
              onChange={(e) =>
                setLength(Math.min(128, Math.max(4, Number(e.target.value) || 4)))
              }
              className="w-20"
            />
          </label>
          {(
            [
              ["Lowercase", useLower, setUseLower],
              ["Uppercase", useUpper, setUseUpper],
              ["Digits", useDigits, setUseDigits],
              ["Symbols", useSymbols, setUseSymbols],
            ] as const
          ).map(([label, val, set]) => (
            <label key={label} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => set(e.target.checked)}
                className="accent-emerald-500"
              />
              {label}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={excludeAmbiguous}
              onChange={(e) => setExcludeAmbiguous(e.target.checked)}
              className="accent-emerald-500"
            />
            Exclude ambiguous (0O1lI)
          </label>
          <Button type="button" onClick={generate}>
            Regenerate
          </Button>
        </div>

        <Panel title="Password" actions={<CopyButton value={password} />}>
          <p className="break-all font-mono text-lg text-emerald-300">{password || "—"}</p>
          {password ? (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Strength</span>
                <span className="capitalize text-zinc-400">{strength.level}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={cn("h-full rounded-full transition-all", STRENGTH_COLORS[strength.level])}
                  style={{ width: `${(strength.score / strength.max) * 100}%` }}
                />
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </>
  );
}
