"use client";

import { ArrowLeftRight, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { cn, downloadBlob } from "@/lib/utils";

type Mode = "encode" | "decode";

const FILE_SIZE_LIMIT = 8 * 1024 * 1024;
const TEXT_PREVIEW_LIMIT = 4000;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function CodecTool({
  title,
  description,
  slug,
  sample,
  encode,
  decode,
  outputFilename = "output.txt",
  hideHeader = false,
}: {
  title: string;
  description: string;
  slug?: string;
  sample?: string;
  encode: (input: string) => string;
  decode: (input: string) => string;
  outputFilename?: string;
  hideHeader?: boolean;
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

  const swap = useCallback(() => {
    if (!output && !input) return;
    setInput(output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  }, [input, output]);

  return (
    <>
      {hideHeader ? null : (
        <ToolHeader name={title} description={description} slug={slug} />
      )}
      <TextIO
        input={input}
        output={output}
        onInputChange={setInput}
        onClear={() => setInput("")}
        outputFilename={outputFilename}
        error={codecError}
        options={
          <div className="flex flex-wrap items-center gap-2">
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
            {sample ? (
              <SampleButton onClick={() => setInput(sample)} />
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={swap}
              disabled={!output && !input}
              aria-label="Swap input and output"
            >
              <ArrowLeftRight className="size-4" />
              Swap
            </Button>
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64Encode(text: string): string {
  return bytesToBase64(utf8ToBytes(text));
}

function base64Decode(text: string): string {
  return bytesToUtf8(base64ToBytes(text.replace(/\s/g, "")));
}

function stripBase64Input(raw: string): { b64: string; mime?: string } {
  const trimmed = raw.trim();
  const dataUrlMatch = trimmed.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,([\s\S]+)$/i);
  if (dataUrlMatch) {
    return {
      b64: dataUrlMatch[2].replace(/\s/g, ""),
      mime: dataUrlMatch[1] || undefined,
    };
  }
  return { b64: trimmed.replace(/\s/g, "") };
}

function sniffMime(bytes: Uint8Array): string {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return "image/webp";
  }
  try {
    const text = bytesToUtf8(bytes.slice(0, Math.min(bytes.length, 512))).trim();
    if (text.startsWith("{") || text.startsWith("[")) return "application/json";
    if (/^[\x09\x0a\x0d\x20-\x7e]*$/.test(text)) return "text/plain";
  } catch {
    /* binary */
  }
  return "application/octet-stream";
}

type PreviewKind = "image" | "text" | "pdf" | "none";

function previewKindFor(mime: string, bytes: Uint8Array): PreviewKind {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime.endsWith("+json")
  ) {
    return "text";
  }
  const sniffed = sniffMime(bytes);
  if (sniffed.startsWith("image/")) return "image";
  if (sniffed === "application/pdf") return "pdf";
  if (sniffed === "text/plain" || sniffed === "application/json") return "text";
  return "none";
}

function guessFilename(rawName: string | null, mime: string): string {
  if (rawName) {
    const base = rawName.replace(/\.(b64|txt)$/i, "");
    if (base && base !== rawName) return base;
    if (base) return base;
  }
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/jpeg"
        ? "jpg"
        : mime === "image/gif"
          ? "gif"
          : mime === "image/webp"
            ? "webp"
            : mime === "application/pdf"
              ? "pdf"
              : mime === "application/json"
                ? "json"
                : mime.startsWith("text/")
                  ? "txt"
                  : "bin";
  return `decoded.${ext}`;
}

function FileDropzone({
  label,
  accept,
  onFile,
  disabled,
}: {
  label: string;
  accept?: string;
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = useCallback(
    (file: File | null | undefined) => {
      if (!file || disabled) return;
      onFile(file);
    },
    [disabled, onFile],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        pick(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors",
        dragOver
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-zinc-700 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900/50",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Upload className="size-8 text-zinc-500" />
      <p className="text-sm text-zinc-300">{label}</p>
      <p className="text-xs text-zinc-500">Drop a file here or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}

function Base64FileTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [encodeFile, setEncodeFile] = useState<File | null>(null);
  const [encodeB64, setEncodeB64] = useState("");
  const [encodeError, setEncodeError] = useState<string | null>(null);
  const [encodeBlocked, setEncodeBlocked] = useState(false);
  const [dataUrlMode, setDataUrlMode] = useState(false);

  const [decodeInput, setDecodeInput] = useState("");
  const [decodeFileName, setDecodeFileName] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [decodedBlob, setDecodedBlob] = useState<Blob | null>(null);
  const [decodedMime, setDecodedMime] = useState("application/octet-stream");
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<PreviewKind>("none");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const revokePreviewUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setObjectUrl(null);
  }, []);

  const processEncodeFile = useCallback(async (file: File) => {
    setEncodeError(null);
    setEncodeBlocked(false);
    if (file.size > FILE_SIZE_LIMIT) {
      setEncodeError(
        `File is ${formatFileSize(file.size)} — over the ~8 MB limit. Encoding blocked to protect browser memory.`,
      );
      setEncodeBlocked(true);
      setEncodeFile(file);
      setEncodeB64("");
      return;
    }
    if (file.size > FILE_SIZE_LIMIT * 0.75) {
      setEncodeError(
        `Large file (${formatFileSize(file.size)}). Processing may be slow near the ~8 MB limit.`,
      );
    }
    setEncodeFile(file);
    try {
      const buf = await file.arrayBuffer();
      setEncodeB64(bytesToBase64(new Uint8Array(buf)));
    } catch {
      setEncodeError("Failed to read file");
      setEncodeB64("");
    }
  }, []);

  const encodeOutput = useMemo(() => {
    if (!encodeB64) return "";
    if (dataUrlMode && encodeFile) {
      const mime = encodeFile.type || "application/octet-stream";
      return `data:${mime};base64,${encodeB64}`;
    }
    return encodeB64;
  }, [encodeB64, dataUrlMode, encodeFile]);

  useEffect(() => {
    if (mode !== "decode") return;
    if (!decodeInput.trim()) {
      setDecodeError(null);
      setDecodedBlob(null);
      setTextPreview(null);
      setPreviewKind("none");
      revokePreviewUrl();
      return;
    }

    try {
      const { b64, mime: dataMime } = stripBase64Input(decodeInput);
      if (!b64) throw new Error("Empty Base64 input");
      const bytes = base64ToBytes(b64);
      if (bytes.length > FILE_SIZE_LIMIT) {
        throw new Error(
          `Decoded size ${formatFileSize(bytes.length)} exceeds the ~8 MB limit.`,
        );
      }
      const mime = dataMime ?? sniffMime(bytes);
      const blob = new Blob([Uint8Array.from(bytes)], { type: mime });
      setDecodedBlob(blob);
      setDecodedMime(mime);
      setDecodeError(null);

      const kind = previewKindFor(mime, bytes);
      setPreviewKind(kind);
      revokePreviewUrl();

      if (kind === "text") {
        const full = bytesToUtf8(bytes);
        setTextPreview(
          full.length > TEXT_PREVIEW_LIMIT
            ? `${full.slice(0, TEXT_PREVIEW_LIMIT)}\n\n… truncated (${full.length.toLocaleString()} chars total)`
            : full,
        );
      } else if (kind === "image" || kind === "pdf") {
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setObjectUrl(url);
        setTextPreview(null);
      } else {
        setTextPreview(null);
      }
    } catch (e) {
      setDecodeError(e instanceof Error ? e.message : "Decode failed");
      setDecodedBlob(null);
      setTextPreview(null);
      setPreviewKind("none");
      revokePreviewUrl();
    }
  }, [decodeInput, mode, revokePreviewUrl]);

  const loadDecodeFile = useCallback(async (file: File) => {
    if (file.size > FILE_SIZE_LIMIT) {
      setDecodeError(
        `File is ${formatFileSize(file.size)} — over the ~8 MB limit.`,
      );
      setDecodeInput("");
      setDecodeFileName(file.name);
      return;
    }
    setDecodeFileName(file.name);
    try {
      const text = await file.text();
      setDecodeInput(text);
      setDecodeError(null);
    } catch {
      setDecodeError("Failed to read file");
    }
  }, []);

  const downloadDecoded = useCallback(() => {
    if (!decodedBlob) return;
    downloadBlob(guessFilename(decodeFileName, decodedMime), decodedBlob);
  }, [decodedBlob, decodeFileName, decodedMime]);

  return (
    <div className="flex min-h-[28rem] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
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

      {mode === "encode" ? (
        <>
          <FileDropzone
            label="Upload any file to encode"
            onFile={processEncodeFile}
            disabled={encodeBlocked}
          />
          {encodeFile ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
              <span className="text-zinc-500">File:</span> {encodeFile.name}{" "}
              <span className="text-zinc-500">· MIME:</span>{" "}
              {encodeFile.type || "application/octet-stream"}{" "}
              <span className="text-zinc-500">· Size:</span>{" "}
              {formatFileSize(encodeFile.size)}
            </div>
          ) : null}
          {encodeError ? (
            <p
              className={cn(
                "rounded-xl border px-3 py-2 text-sm",
                encodeBlocked
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200",
              )}
            >
              {encodeError}
            </p>
          ) : null}
          {!encodeBlocked && encodeFile ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={dataUrlMode ? "primary" : "outline"}
                  onClick={() => setDataUrlMode((v) => !v)}
                >
                  Data URL
                </Button>
                <ClearButton
                  onClick={() => {
                    setEncodeFile(null);
                    setEncodeB64("");
                    setEncodeError(null);
                    setEncodeBlocked(false);
                  }}
                />
              </div>
              <Panel
                title="Base64 output"
                actions={
                  <>
                    <CopyButton value={encodeOutput} />
                    <DownloadButton
                      value={encodeB64}
                      filename={`${encodeFile.name.replace(/\.[^.]+$/, "") || "file"}.b64`}
                    />
                  </>
                }
              >
                <Textarea
                  value={encodeOutput}
                  readOnly
                  className="min-h-[16rem] border-0 bg-zinc-950 p-0 focus:ring-0 lg:min-h-[20rem]"
                />
              </Panel>
            </>
          ) : null}
        </>
      ) : (
        <>
          <FileDropzone
            label="Upload .b64 or text file"
            accept=".b64,.txt,text/plain"
            onFile={loadDecodeFile}
          />
          <Panel
            title="Base64 input"
            actions={
              <ClearButton
                onClick={() => {
                  setDecodeInput("");
                  setDecodeFileName(null);
                  setDecodeError(null);
                }}
              />
            }
          >
            <Textarea
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder="Paste Base64 or a data:…;base64, URL…"
              className="min-h-[12rem] border-0 bg-zinc-950 p-0 focus:ring-0"
            />
          </Panel>
          {decodeError ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {decodeError}
            </p>
          ) : null}
          {decodedBlob ? (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                <span>
                  <span className="text-zinc-500">MIME:</span> {decodedMime}
                </span>
                <span>
                  <span className="text-zinc-500">Size:</span>{" "}
                  {formatFileSize(decodedBlob.size)}
                </span>
                {decodeFileName ? (
                  <span>
                    <span className="text-zinc-500">Source:</span> {decodeFileName}
                  </span>
                ) : null}
                <Button type="button" onClick={downloadDecoded}>
                  Download file
                </Button>
              </div>
              {previewKind === "image" && objectUrl ? (
                <Panel title="Preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={objectUrl}
                    alt="Decoded preview"
                    className="max-h-96 max-w-full rounded-xl"
                  />
                </Panel>
              ) : null}
              {previewKind === "pdf" && objectUrl ? (
                <Panel title="Preview">
                  <iframe
                    src={objectUrl}
                    title="PDF preview"
                    className="h-[28rem] w-full rounded-xl border border-zinc-800 bg-zinc-950"
                  />
                </Panel>
              ) : null}
              {previewKind === "text" && textPreview != null ? (
                <Panel title="Preview">
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-zinc-200">
                    {textPreview}
                  </pre>
                </Panel>
              ) : null}
              {previewKind === "none" ? (
                <p className="text-sm text-zinc-500">
                  No inline preview for this type — use Download file.
                </p>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
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
  return JSON.parse(
    `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`,
  ) as string;
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
      return code <= 0xff
        ? `\\x${code.toString(16).padStart(2, "0")}`
        : `\\u${code.toString(16).padStart(4, "0")}`;
    });
}

function escapeSequencesDecode(text: string): string {
  return text.replace(
    /\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|u\{[0-9a-fA-F]+\}|[^xu])/g,
    (_, seq: string) => {
      if (seq.startsWith("x")) return String.fromCharCode(parseInt(seq.slice(1), 16));
      if (seq.startsWith("u{")) return String.fromCodePoint(parseInt(seq.slice(2, -1), 16));
      if (seq.startsWith("u")) return String.fromCharCode(parseInt(seq.slice(1), 16));
      const map: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        f: "\f",
        v: "\v",
        0: "\0",
        "\\": "\\",
      };
      return map[seq] ?? seq;
    },
  );
}

type Base64Tab = "text" | "file" | "base32";

export function base64() {
  const meta = getToolBySlug("base64");
  const [tab, setTab] = useState<Base64Tab>("text");

  return (
    <>
      <ToolHeader
        slug="base64"
        name={meta?.name ?? "Base64 / Base32"}
        description={
          meta?.description ?? "Encode and decode Base64 (text/file) or Base32 strings."
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["text", "Base64 text"],
            ["file", "Base64 file"],
            ["base32", "Base32"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={tab === key ? "primary" : "outline"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tab === "text" ? (
        <CodecTool
          hideHeader
          title="Base64 Encoding"
          description="Encode and decode Base64 strings."
          slug="base64"
          sample="Hello, 世界!"
          encode={base64Encode}
          decode={base64Decode}
          outputFilename="base64.txt"
        />
      ) : tab === "file" ? (
        <Base64FileTool />
      ) : (
        <CodecTool
          hideHeader
          title="Base32 Encoding"
          description="Encode and decode Base32 strings."
          slug="base64"
          sample="Hello, Base32!"
          encode={base32Encode}
          decode={base32Decode}
          outputFilename="base32.txt"
        />
      )}
    </>
  );
}

export function urlEncoding() {
  return (
    <CodecTool
      title="URL Encoding"
      description="Percent-encode and decode URLs."
      slug="url-encoding"
      sample="hello world?foo=bar&baz=qux"
      encode={(s) => encodeURIComponent(s)}
      decode={(s) => decodeURIComponent(s)}
      outputFilename="url-encoded.txt"
    />
  );
}

export function htmlEntities() {
  return (
    <CodecTool
      title="HTML Entities Escaping"
      description="Escape and unescape HTML entities."
      slug="html-entities"
      sample={'<script>alert("x")</script>'}
      encode={htmlEncode}
      decode={htmlDecode}
      outputFilename="html-entities.txt"
    />
  );
}

type JsonEscapeTab = "json" | "sequences";

export function jsonEscape() {
  const meta = getToolBySlug("json-escape");
  const [tab, setTab] = useState<JsonEscapeTab>("json");

  return (
    <>
      <ToolHeader
        slug="json-escape"
        name={meta?.name ?? "String Escaping"}
        description={
          meta?.description ?? "Escape JSON string literals or convert escape sequences."
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["json", "JSON string"],
            ["sequences", "Escape sequences"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={tab === key ? "primary" : "outline"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tab === "json" ? (
        <CodecTool
          hideHeader
          title="JSON String Escaping"
          description="Escape and unescape JSON string literals."
          slug="json-escape"
          sample={'Line1\nLine2\t"quoted"'}
          encode={jsonEscapeEncode}
          decode={jsonEscapeDecode}
          outputFilename="json-escape.txt"
        />
      ) : (
        <CodecTool
          hideHeader
          title="Escape Sequences"
          description="Convert between raw text and escape sequences."
          slug="json-escape"
          sample={"Hello\nWorld\t!"}
          encode={escapeSequencesEncode}
          decode={escapeSequencesDecode}
          outputFilename="escapes.txt"
        />
      )}
    </>
  );
}
