"use client";

import { decodeJwt, jwtVerify } from "jose";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CopyButton,
  Panel,
  TextIO,
  ToolHeader,
} from "@/components/tool-workspace";

async function shaHash(alg: "SHA-256" | "SHA-384" | "SHA-512", text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest(alg, data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
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
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let i = 0; i < x.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[i], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = ii(a, b, c, d, x[i], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = (a + oa) | 0; b = (b + ob) | 0; c = (c + oc) | 0; d = (d + od) | 0;
  }
  return [a, b, c, d].map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("");
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function pemFromBuffer(label: string, buf: ArrayBuffer): string {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

type HashAlg = "SHA-256" | "SHA-384" | "SHA-512" | "MD5";

export function hashing() {
  const [input, setInput] = useState("");
  const [alg, setAlg] = useState<HashAlg>("SHA-256");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input) {
      setOutput("");
      setError(null);
      return;
    }
    (async () => {
      try {
        if (alg === "MD5") {
          setOutput(md5(input));
        } else {
          setOutput(await shaHash(alg, input));
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Hash failed");
        setOutput("");
      }
    })();
  }, [input, alg]);

  return (
    <>
      <ToolHeader name="Hashing" description="Hash text with SHA-256/384/512 (and MD5 label as legacy)." />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        outputFilename="hash.txt"
        error={error}
        options={
          <div className="flex flex-wrap gap-2">
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
          </div>
        }
      />
    </>
  );
}

export function hmac() {
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input || !key) {
      setOutput("");
      setError(null);
      return;
    }
    hmacSha256(key, input)
      .then((h) => {
        setOutput(h);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "HMAC failed");
        setOutput("");
      });
  }, [input, key]);

  return (
    <>
      <ToolHeader name="HMAC" description="Compute HMAC signatures with a secret key." />
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
        <label className="text-sm text-zinc-400">Secret key</label>
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter secret key…"
          className="max-w-md flex-1"
        />
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

export function jwt() {
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    (async () => {
      try {
        const parts = token.trim().split(".");
        if (parts.length !== 3) throw new Error("Invalid JWT format (expected 3 parts)");
        const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
        const payload = decodeJwt(token.trim());
        let verifyNote = "";
        if (secret.trim()) {
          try {
            await jwtVerify(token.trim(), new TextEncoder().encode(secret.trim()));
            verifyNote = "\n\n✓ Signature verified with provided secret (HS256)";
          } catch {
            verifyNote = "\n\n✗ Signature verification failed with provided secret";
          }
        }
        setOutput(
          JSON.stringify({ header, payload }, null, 2) + verifyNote,
        );
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "JWT decode failed");
        setOutput("");
      }
    })();
  }, [token, secret]);

  return (
    <>
      <ToolHeader name="JSON Web Token (JWT)" description="Decode JWTs and optionally verify with a secret." />
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
        <label className="text-sm text-zinc-400">Verify secret (optional, HS256)</label>
        <Input
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="HMAC secret…"
          className="max-w-md flex-1"
          type="password"
        />
      </div>
      <TextIO
        input={token}
        output={output}
        onInputChange={setToken}
        onClear={() => setToken("")}
        inputLabel="JWT"
        outputLabel="Decoded"
        outputFilename="jwt.json"
        error={error}
      />
    </>
  );
}

type KeyType = "RSA-OAEP" | "ECDSA-P256" | "Ed25519";

export function keyGenerator() {
  const [keyType, setKeyType] = useState<KeyType>("RSA-OAEP");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let publicPem = "";
      let privatePem = "";
      if (keyType === "RSA-OAEP") {
        const pair = await crypto.subtle.generateKey(
          { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
          true,
          ["encrypt", "decrypt"],
        );
        const pub = await crypto.subtle.exportKey("spki", pair.publicKey);
        const priv = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
        publicPem = pemFromBuffer("PUBLIC KEY", pub);
        privatePem = pemFromBuffer("PRIVATE KEY", priv);
      } else if (keyType === "ECDSA-P256") {
        const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
        const pub = await crypto.subtle.exportKey("spki", pair.publicKey);
        const priv = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
        publicPem = pemFromBuffer("PUBLIC KEY", pub);
        privatePem = pemFromBuffer("PRIVATE KEY", priv);
      } else {
        const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
        const pub = await crypto.subtle.exportKey("spki", pair.publicKey);
        const priv = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
        publicPem = pemFromBuffer("PUBLIC KEY", pub);
        privatePem = pemFromBuffer("PRIVATE KEY", priv);
      }
      setOutput(`# Public Key (SPKI)\n${publicPem}\n\n# Private Key (PKCS8)\n${privatePem}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Key generation failed");
      setOutput("");
    } finally {
      setLoading(false);
    }
  }, [keyType]);

  return (
    <>
      <ToolHeader name="Key Generator" description="Generate RSA, ECDSA, or Ed25519 keys in your browser." />
      <div className="flex min-h-[28rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          {(["RSA-OAEP", "ECDSA-P256", "Ed25519"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={keyType === t ? "primary" : "outline"}
              onClick={() => setKeyType(t)}
            >
              {t}
            </Button>
          ))}
          <Button type="button" onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate keys"}
          </Button>
        </div>
        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
        ) : null}
        <Panel title="PEM output" actions={<CopyButton value={output} />}>
          <Textarea
            value={output}
            readOnly
            placeholder="Generated keys appear here…"
            className="min-h-[20rem] border-0 bg-transparent p-0 font-mono text-xs focus:ring-0"
          />
        </Panel>
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

export function passwordGenerator() {
  const [length, setLength] = useState(20);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [password, setPassword] = useState("");

  const generate = useCallback(() => {
    let pool = "";
    if (useLower) pool += CHARSETS.lower;
    if (useUpper) pool += CHARSETS.upper;
    if (useDigits) pool += CHARSETS.digits;
    if (useSymbols) pool += CHARSETS.symbols;
    if (!pool) {
      setPassword("");
      return;
    }
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    setPassword(Array.from(arr, (n) => pool[n % pool.length]).join(""));
  }, [length, useLower, useUpper, useDigits, useSymbols]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <>
      <ToolHeader name="Password Generator" description="Generate strong random passwords." />
      <div className="flex min-h-[20rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Length
            <Input
              type="number"
              min={4}
              max={128}
              value={length}
              onChange={(e) => setLength(Math.min(128, Math.max(4, Number(e.target.value) || 4)))}
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
              <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-emerald-500" />
              {label}
            </label>
          ))}
          <Button type="button" onClick={generate}>
            Regenerate
          </Button>
        </div>
        <Panel title="Password" actions={<CopyButton value={password} />}>
          <p className="break-all font-mono text-lg text-emerald-300">{password || "—"}</p>
        </Panel>
      </div>
    </>
  );
}
