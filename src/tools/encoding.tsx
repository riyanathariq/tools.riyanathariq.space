"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextIO, ToolHeader } from "@/components/tool-workspace";

type Mode = "encode" | "decode";

function CodecTool({
  title,
  description,
  encode,
  decode,
  outputFilename = "output.txt",
}: {
  title: string;
  description: string;
  encode: (input: string) => string;
  decode: (input: string) => string;
  outputFilename?: string;
}) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("encode");
  const { output, error: codecError } = useMemo(() => {
    if (!input) return { output: "", error: null as string | null };
    try {
      const result = mode === "encode" ? encode(input) : decode(input);
      return { output: result, error: null };
    } catch (e) {
      return {
        output: "",
        error: e instanceof Error ? e.message : "Conversion failed",
      };
    }
  }, [input, mode, encode, decode]);

  return (
    <>
      <ToolHeader name={title} description={description} />
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        outputFilename={outputFilename}
        error={codecError}
        options={
          <div className="flex gap-2">
            {(["encode", "decode"] as const).map((m) => (
              <Button
                key={m}
                type="button"
                variant={mode === m ? "primary" : "outline"}
                onClick={() => setMode(m)}
                className="capitalize"
              >
                {m}
              </Button>
            ))}
          </div>
        }
      />
    </>
  );
}

function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function base64Encode(text: string): string {
  const bytes = utf8ToBytes(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64Decode(text: string): string {
  const binary = atob(text.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return bytesToUtf8(bytes);
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(text: string): string {
  const bytes = utf8ToBytes(text);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(text: string): string {
  const cleaned = text.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid Base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return bytesToUtf8(new Uint8Array(bytes));
}

function urlBase64Encode(text: string): string {
  return base64Encode(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function urlBase64Decode(text: string): string {
  let b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return base64Decode(b64);
}

function mimeBase64Encode(text: string): string {
  const b64 = base64Encode(text);
  return b64.replace(/.{1,76}/g, (line) => line + "\n").trim();
}

function mimeBase64Decode(text: string): string {
  return base64Decode(text.replace(/\s/g, ""));
}

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function htmlEncode(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);
}

function htmlDecode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function jsonEscapeEncode(text: string): string {
  return JSON.stringify(text).slice(1, -1);
}

function jsonEscapeDecode(text: string): string {
  return JSON.parse(`"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`) as string;
}

function xmlEscapeEncode(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlEscapeDecode(text: string): string {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function csvEscapeEncode(text: string): string {
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvEscapeDecode(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return text;
}

function escapeSequencesEncode(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v")
    .replace(/\0/g, "\\0")
    .replace(/[\x00-\x1f\x7f-\x9f]/g, (c) => {
      const code = c.charCodeAt(0);
      return code <= 0xff ? `\\x${code.toString(16).padStart(2, "0")}` : `\\u${code.toString(16).padStart(4, "0")}`;
    });
}

function escapeSequencesDecode(text: string): string {
  return text.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|u\{[0-9a-fA-F]+\}|[^xu])/g, (_, seq: string) => {
    if (seq.startsWith("x")) return String.fromCharCode(parseInt(seq.slice(1), 16));
    if (seq.startsWith("u{")) return String.fromCodePoint(parseInt(seq.slice(2, -1), 16));
    if (seq.startsWith("u")) return String.fromCharCode(parseInt(seq.slice(1), 16));
    const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", f: "\f", v: "\v", 0: "\0", "\\": "\\" };
    return map[seq] ?? seq;
  });
}

export function base64() {
  return (
    <CodecTool
      title="Base64 Encoding"
      description="Encode and decode Base64 strings."
      encode={base64Encode}
      decode={base64Decode}
      outputFilename="base64.txt"
    />
  );
}

export function base32() {
  return (
    <CodecTool
      title="Base32 Encoding"
      description="Encode and decode Base32 strings."
      encode={base32Encode}
      decode={base32Decode}
      outputFilename="base32.txt"
    />
  );
}

export function urlEncoding() {
  return (
    <CodecTool
      title="URL Encoding"
      description="Percent-encode and decode URLs."
      encode={(s) => encodeURIComponent(s)}
      decode={(s) => decodeURIComponent(s)}
      outputFilename="url-encoded.txt"
    />
  );
}

export function urlBase64() {
  return (
    <CodecTool
      title="URL Base64 Encoding"
      description="URL-safe Base64 encode and decode."
      encode={urlBase64Encode}
      decode={urlBase64Decode}
      outputFilename="base64url.txt"
    />
  );
}

export function mimeBase64() {
  return (
    <CodecTool
      title="MIME Base64 Encoding"
      description="Base64 with MIME line wrapping (76 chars)."
      encode={mimeBase64Encode}
      decode={mimeBase64Decode}
      outputFilename="mime-base64.txt"
    />
  );
}

export function htmlEntities() {
  return (
    <CodecTool
      title="HTML Entities Escaping"
      description="Escape and unescape HTML entities."
      encode={htmlEncode}
      decode={htmlDecode}
      outputFilename="html-entities.txt"
    />
  );
}

export function jsonEscape() {
  return (
    <CodecTool
      title="JSON String Escaping"
      description="Escape and unescape JSON string literals."
      encode={jsonEscapeEncode}
      decode={jsonEscapeDecode}
      outputFilename="json-escape.txt"
    />
  );
}

export function xmlEscape() {
  return (
    <CodecTool
      title="XML Text Escaping"
      description="Escape and unescape XML text."
      encode={xmlEscapeEncode}
      decode={xmlEscapeDecode}
      outputFilename="xml-escape.txt"
    />
  );
}

export function csvEscape() {
  return (
    <CodecTool
      title="CSV Text Escaping"
      description="Escape and unescape CSV fields."
      encode={csvEscapeEncode}
      decode={csvEscapeDecode}
      outputFilename="csv-escape.txt"
    />
  );
}

export function escapeSequences() {
  return (
    <CodecTool
      title="Escape Sequences"
      description="Convert between raw text and escape sequences."
      encode={escapeSequencesEncode}
      decode={escapeSequencesDecode}
      outputFilename="escapes.txt"
    />
  );
}
