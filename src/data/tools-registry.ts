import type { ToolMeta } from "@/types/tool";

export const toolsRegistry: ToolMeta[] = [
  // Encoding
  { slug: "base64", name: "Base64 Encoding", description: "Encode and decode Base64 strings.", category: "encoding", keywords: ["base64", "encode", "decode"] },
  { slug: "base32", name: "Base32 Encoding", description: "Encode and decode Base32 strings.", category: "encoding", keywords: ["base32"] },
  { slug: "url-encoding", name: "URL Encoding", description: "Percent-encode and decode URLs.", category: "encoding", keywords: ["url", "percent", "uri"] },
  { slug: "url-base64", name: "URL Base64 Encoding", description: "URL-safe Base64 encode and decode.", category: "encoding", keywords: ["base64url"] },
  { slug: "mime-base64", name: "MIME Base64 Encoding", description: "Base64 with MIME line wrapping (76 chars).", category: "encoding", keywords: ["mime", "base64"] },
  { slug: "html-entities", name: "HTML Entities Escaping", description: "Escape and unescape HTML entities.", category: "encoding", keywords: ["html", "entities"] },
  { slug: "json-escape", name: "JSON String Escaping", description: "Escape and unescape JSON string literals.", category: "encoding", keywords: ["json", "escape"] },
  { slug: "xml-escape", name: "XML Text Escaping", description: "Escape and unescape XML text.", category: "encoding", keywords: ["xml"] },
  { slug: "csv-escape", name: "CSV Text Escaping", description: "Escape and unescape CSV fields.", category: "encoding", keywords: ["csv"] },
  { slug: "escape-sequences", name: "Escape Sequences", description: "Convert between raw text and escape sequences.", category: "encoding", keywords: ["escape", "unicode"] },

  // Crypto
  { slug: "hashing", name: "Hashing", description: "Hash text with SHA-256/384/512 (and MD5 label as legacy).", category: "crypto", keywords: ["hash", "sha", "md5"] },
  { slug: "hmac", name: "HMAC", description: "Compute HMAC signatures with a secret key.", category: "crypto", keywords: ["hmac", "signature"] },
  { slug: "jwt", name: "JSON Web Token (JWT)", description: "Decode JWTs and optionally verify with a secret.", category: "crypto", keywords: ["jwt", "token", "auth"] },
  { slug: "key-generator", name: "Key Generator", description: "Generate RSA, ECDSA, or Ed25519 keys in your browser.", category: "crypto", keywords: ["ssh", "pem", "rsa", "ed25519"] },
  { slug: "password-generator", name: "Password Generator", description: "Generate strong random passwords.", category: "crypto", keywords: ["password", "random"] },

  // IDs & time
  { slug: "uuid", name: "UUID", description: "Generate and validate UUIDs.", category: "ids", keywords: ["uuid", "guid"] },
  { slug: "ulid", name: "ULID", description: "Generate Universally Unique Lexicographically Sortable IDs.", category: "ids", keywords: ["ulid"] },
  { slug: "nanoid", name: "Nano ID", description: "Generate compact URL-friendly unique IDs.", category: "ids", keywords: ["nanoid"] },
  { slug: "cron", name: "Cron Expression", description: "Explain cron expressions and show next run times.", category: "ids", keywords: ["cron", "schedule"] },
  { slug: "datetime", name: "Date and Time", description: "Convert between Unix timestamps and ISO dates.", category: "ids", keywords: ["unix", "timestamp", "iso"] },

  // Data & text
  { slug: "json-prettier", name: "JSON Prettier", description: "Format, minify, validate, and sort JSON keys.", category: "data", keywords: ["json", "pretty", "format"] },
  { slug: "json-path", name: "JSON Path", description: "Query JSON with simple path expressions.", category: "data", keywords: ["jsonpath", "query"] },
  { slug: "json-schema", name: "JSON Schema", description: "Validate JSON against a schema (basic draft checks).", category: "data", keywords: ["schema", "validate"] },
  { slug: "regex", name: "Regular Expression", description: "Test regex patterns with live match groups.", category: "data", keywords: ["regex", "regexp"] },
  { slug: "text-diff", name: "Text Diff", description: "Compare two texts and highlight differences.", category: "data", keywords: ["diff", "compare"] },
  { slug: "text-case", name: "Text Case", description: "Convert between camel, snake, kebab, and more.", category: "data", keywords: ["case", "camel", "snake"] },
  { slug: "text-statistic", name: "Text Statistic", description: "Count characters, words, lines, and bytes.", category: "data", keywords: ["count", "words"] },
  { slug: "text-filter", name: "Text Filter", description: "Filter lines by include/exclude patterns.", category: "data", keywords: ["filter", "grep"] },
  { slug: "text-sorting", name: "Text Sorting", description: "Sort lines alphabetically or numerically.", category: "data", keywords: ["sort"] },
  { slug: "text-format", name: "Text Format", description: "Trim, wrap, dedupe, and normalize whitespace.", category: "data", keywords: ["trim", "format"] },
  { slug: "sql-format", name: "SQL Formatting", description: "Pretty-print SQL queries.", category: "data", keywords: ["sql", "format"] },
  { slug: "lorem-ipsum", name: "Lorem Ipsum", description: "Generate placeholder paragraphs.", category: "data", keywords: ["lorem", "placeholder"] },
  { slug: "code-format", name: "Code Style Formatting", description: "Format JSON, JS-ish objects, and CSS-ish blocks lightly.", category: "data", keywords: ["prettier", "format", "code"] },

  // HTTP & CLI
  { slug: "curl-explainer", name: "cURL Explainer", description: "Parse curl commands into structured requests and generate fetch code.", category: "http", keywords: ["curl", "http", "fetch"] },
  { slug: "cli-helpers", name: "CLI Command Helpers", description: "Quick encode/quote helpers for shell commands.", category: "http", keywords: ["cli", "shell", "bash"] },

  // Media
  { slug: "image-converter", name: "Image Converter", description: "Convert and resize images in your browser.", category: "media", keywords: ["image", "png", "jpeg", "webp"] },
  { slug: "qr-code", name: "QR Code", description: "Generate QR codes from text or URLs.", category: "media", keywords: ["qr", "barcode"] },
  { slug: "color-picker", name: "Color Picker", description: "Convert between HEX, RGB, and HSL.", category: "media", keywords: ["color", "hex", "rgb"] },

  // Misc
  { slug: "units-converter", name: "Units Converter", description: "Convert length, weight, temperature, and data size.", category: "misc", keywords: ["units", "convert"] },
  { slug: "ascii-encoding", name: "ASCII Encoding", description: "Convert text to ASCII codes and back.", category: "misc", keywords: ["ascii"] },
  { slug: "ascii-art", name: "ASCII Art", description: "Render simple banner-style ASCII art from text.", category: "misc", keywords: ["ascii", "art", "banner"] },
  { slug: "rubber-duck", name: "Rubber Duck", description: "Talk through a bug — local scratchpad, nothing leaves your device.", category: "misc", keywords: ["debug", "duck"] },
];

export function getToolBySlug(slug: string) {
  return toolsRegistry.find((t) => t.slug === slug);
}

export function searchTools(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return toolsRegistry;
  return toolsRegistry.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.includes(q)) ||
      t.slug.includes(q),
  );
}
