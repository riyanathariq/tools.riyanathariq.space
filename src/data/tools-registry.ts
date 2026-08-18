import type { ToolMeta } from "@/types/tool";

export const toolsRegistry: ToolMeta[] = [
  // Cloud / Premium tools (login + Go API)
  {
    slug: "smtp-tester",
    name: "SMTP Tester",
    description: "Send a test email using your own SMTP host, port, and credentials.",
    category: "cloud",
    keywords: ["smtp", "email", "mail", "starttls", "premium"],
    cloud: true,
    info: "Bring your own SMTP (Gmail app password, SES, SendGrid, etc.). Test credentials (AUTH only) or send a real message. Credentials are not stored. Sign-in required. Rate limited.",
  },
  {
    slug: "webhook-bin",
    name: "Webhook Bin",
    description: "Unique URL that captures inbound HTTP requests for debugging webhooks.",
    category: "cloud",
    keywords: ["webhook", "hook", "http", "request bin", "stripe", "github", "premium"],
    cloud: true,
    info: "Create a public /hook/{id} endpoint, point any provider at it, and inspect method, headers, query, and body live. Up to 3 bins, 100 hits each, 72h TTL. Auth/Cookie headers are redacted. Sign-in required.",
  },

  // Encoding
  {
    slug: "base64",
    name: "Base64 / Base32",
    description: "Encode and decode Base64 (text/file) or Base32 strings.",
    category: "encoding",
    keywords: ["base64", "base32", "encode", "decode", "file"],
    info: "Base64 text mode encodes UTF-8 strings. File mode reads any binary file into Base64 (optional Data URL) and can decode back to a downloadable file with preview when possible. Base32 tab uses the RFC 4648 alphabet (A–Z, 2–7). Large files (>~8MB) may strain the browser tab.",
  },
  {
    slug: "url-encoding",
    name: "URL Encoding",
    description: "Percent-encode and decode URLs.",
    category: "encoding",
    keywords: ["url", "percent", "uri"],
    info: "Uses encodeURIComponent / decodeURIComponent semantics for path/query-safe encoding. Does not rewrite full URLs component-by-component — paste the fragment you need encoded.",
  },
  {
    slug: "html-entities",
    name: "HTML Entities Escaping",
    description: "Escape and unescape HTML entities.",
    category: "encoding",
    keywords: ["html", "entities"],
    info: "Escapes <, >, &, \", and ' for safe HTML text. Unescape handles common named and numeric entities. Not a full HTML sanitizer.",
  },
  {
    slug: "json-escape",
    name: "String Escaping",
    description: "Escape JSON string literals or convert escape sequences.",
    category: "encoding",
    keywords: ["json", "escape", "unicode", "sequences"],
    info: "JSON tab escapes a string for JSON quotes (\\\\, \\\", control chars). Escape-sequences tab converts between visible escapes (\\\\n, \\\\t, \\\\uXXXX) and raw characters. Not a full JSON prettier.",
  },

  // Crypto
  {
    slug: "hashing",
    name: "Hashing",
    description: "Hash text with SHA-256/384/512 (Web Crypto).",
    category: "crypto",
    keywords: ["hash", "sha", "md5"],
    info: "Hashes with the Web Crypto API (SHA-256/384/512). Output can be hex or Base64. MD5 is not available via Web Crypto here — use SHA for new work.",
  },
  {
    slug: "hmac",
    name: "HMAC",
    description: "Compute HMAC signatures with a secret key.",
    category: "crypto",
    keywords: ["hmac", "signature"],
    info: "Computes HMAC-SHA using your secret and message entirely in the browser. Prefer long random secrets. Output hex or Base64.",
  },
  {
    slug: "jwt",
    name: "JSON Web Token (JWT)",
    description: "Decode, verify, and encode JWTs in your browser.",
    category: "crypto",
    keywords: ["jwt", "token", "auth"],
    info: "Decoder shows header/payload and humanized iat/exp/nbf. Verify with an HMAC secret or public PEM (RS/ES). Encoder signs HS256/384/512 only. Tokens are credentials — paste carefully; nothing is sent to a server.",
  },
  {
    slug: "key-generator",
    name: "Key Generator",
    description: "Generate RSA, ECDSA, or Ed25519 keys in your browser.",
    category: "crypto",
    keywords: ["ssh", "pem", "rsa", "ed25519"],
    info: "Generates PKCS#8 private + SPKI public PEM via Web Crypto. RSA supports 2048/4096 (RSA-OAEP). Ed25519 here is PEM, not OpenSSH authorized_keys format. Prefer OpenSSL locally for production secrets.",
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    description: "Generate strong random passwords.",
    category: "crypto",
    keywords: ["password", "random"],
    info: "Uses crypto.getRandomValues. Toggle character classes and optionally exclude ambiguous glyphs (0/O, 1/l/I). Strength meter is heuristic only.",
  },
  {
    slug: "password-hash",
    name: "Password Hash",
    description: "Hash and verify passwords with bcrypt in your browser.",
    category: "crypto",
    keywords: ["bcrypt", "hash", "password"],
    info: "Client-side bcrypt via bcryptjs (cost 4–12). Useful for demos and local checks — prefer proper KDF settings and secrets management in production.",
  },

  // IDs & time
  {
    slug: "uuid",
    name: "UUID / Nano ID",
    description: "Generate and validate UUIDs (v4/v7), or create Nano IDs.",
    category: "ids",
    keywords: ["uuid", "guid", "v4", "v7", "nanoid"],
    info: "Generate random UUIDv4 or time-ordered UUIDv7, including bulk. Validate newline-separated UUIDs and inspect version/variant (and v7 timestamp when present). Nano ID tab creates compact URL-safe IDs with configurable size.",
  },
  {
    slug: "ulid",
    name: "ULID",
    description: "Generate and validate ULIDs.",
    category: "ids",
    keywords: ["ulid"],
    info: "ULIDs are 26 Crockford Base32 chars, sortable by time. Bulk generate, validate, and decode the embedded millisecond timestamp.",
  },
  {
    slug: "cron",
    name: "Cron Expression",
    description: "Explain cron expressions (5-field or Quartz 6-field) and show next runs.",
    category: "ids",
    keywords: ["cron", "schedule", "quartz"],
    info: "Supports standard 5-field cron (minute hour day month weekday) and a Light 6-field Quartz-style mode with seconds. Next runs use your local timezone. Complex Quartz features (L, W, #) may not parse.",
  },
  {
    slug: "datetime",
    name: "Date and Time",
    description: "Live Unix ↔ calendar converter with formats and timezone.",
    category: "ids",
    keywords: ["unix", "timestamp", "iso"],
    info: "Bidirectional converter between Unix seconds/ms and calendar fields in a chosen IANA timezone. Format presets are for display/copy. Month/year averages are approximate when used as units elsewhere.",
  },
  {
    slug: "timezone-planner",
    name: "Timezone Planner",
    description: "Compare a moment across multiple IANA timezones.",
    category: "ids",
    keywords: ["timezone", "meeting", "planner", "utc"],
    info: "Pick a base date/time and 2–4 timezones to see equivalent local times. Uses Intl — no network calls.",
  },

  // Data & text
  {
    slug: "json-prettier",
    name: "JSON Prettier",
    description: "Format, minify, validate, and sort JSON keys.",
    category: "data",
    keywords: ["json", "pretty", "format"],
    info: "Pretty-print, minify, or sort object keys recursively. Invalid JSON shows a parse error — fix syntax before formatting.",
  },
  {
    slug: "json-path",
    name: "JSON Path",
    description: "Query JSON with simple path expressions.",
    category: "data",
    keywords: ["jsonpath", "query"],
    info: "Lightweight path queries (dot/bracket). Not a full JSONPath RFC implementation — keep expressions simple.",
  },
  {
    slug: "regex",
    name: "Regular Expression",
    description: "Test regex patterns with live match groups.",
    category: "data",
    keywords: ["regex", "regexp"],
    info: "JavaScript RegExp semantics (including flags). Supports replace. Catastrophic backtracking can freeze the tab on pathological patterns.",
  },
  {
    slug: "text-diff",
    name: "Text Diff",
    description: "Side-by-side diff with word-level highlights.",
    category: "data",
    keywords: ["diff", "compare"],
    info: "Compares left vs right with word-level highlights. Options to ignore whitespace or case. Runs entirely in-browser via the diff library.",
  },
  {
    slug: "text-case",
    name: "Text Case",
    description: "Convert between camel, snake, kebab, and more.",
    category: "data",
    keywords: ["case", "camel", "snake"],
    info: "Converts identifiers between common cases. Multi-word input is split on non-alphanumerics; results may need manual tweaks for acronyms.",
  },
  {
    slug: "text-toolkit",
    name: "Text Toolkit",
    description: "Stats, filter, sort, and format text lines in one place.",
    category: "data",
    keywords: ["count", "words", "filter", "grep", "sort", "trim", "format"],
    info: "Four modes: character/word/line/byte stats; include/exclude line filter; alphabetical or numeric sort with unique option; trim/collapse/dedupe formatting. Runs entirely in-browser.",
  },
  {
    slug: "sql-format",
    name: "SQL Formatting",
    description: "Pretty-print SQL queries.",
    category: "data",
    keywords: ["sql", "format"],
    info: "Pretty-prints SQL with sql-formatter. Dialect option affects keyword casing/functions when supported. Does not execute SQL.",
  },
  {
    slug: "lorem-ipsum",
    name: "Lorem Ipsum",
    description: "Generate placeholder paragraphs with varied lengths.",
    category: "data",
    keywords: ["lorem", "placeholder"],
    info: "Generates placeholder Latin-ish paragraphs. Set paragraph count and min/max words so lengths vary instead of identical copies.",
  },
  {
    slug: "markdown-preview",
    name: "Markdown Preview",
    description: "Edit Markdown and preview rendered HTML locally.",
    category: "data",
    keywords: ["markdown", "md", "preview"],
    info: "GFM Markdown preview with tables, fenced code, and syntax highlighting (Highlight.js). Runs in-browser with basic script stripping — not a full sanitizer for untrusted content.",
  },
  {
    slug: "yaml-json",
    name: "YAML ↔ JSON",
    description: "Convert between YAML and JSON.",
    category: "data",
    keywords: ["yaml", "yml", "json"],
    info: "Bidirectional convert via js-yaml. Complex YAML tags/anchors may not round-trip perfectly.",
  },
  {
    slug: "env-toml",
    name: "ENV & TOML",
    description: "Parse .env files and TOML into JSON.",
    category: "data",
    keywords: ["env", "dotenv", "toml"],
    info: "Parses KEY=VALUE env lines and TOML documents into JSON for inspection. Does not execute shell expansions.",
  },
  {
    slug: "openapi-viewer",
    name: "OpenAPI Viewer",
    description: "Paste OpenAPI 3 JSON/YAML and list paths and methods.",
    category: "data",
    keywords: ["openapi", "swagger", "api"],
    info: "Lightweight path/method/summary browser — not full Swagger UI. Accepts OpenAPI 3 JSON or YAML pasted locally.",
  },

  // HTTP & CLI
  {
    slug: "curl-explainer",
    name: "cURL Converter",
    description: "Convert curl commands into client code (fetch, Python, Go, …).",
    category: "http",
    keywords: ["curl", "http", "fetch", "converter"],
    info: "Parses common curl flags (-X, -H, -d, -u, URL) and generates client snippets. Does not execute the request from the browser. Complex shell expansions may not parse.",
  },
  {
    slug: "url-parser",
    name: "URL Parser",
    description: "Break down and rebuild URLs and query strings.",
    category: "http",
    keywords: ["url", "query", "parser"],
    info: "Parses protocol, host, path, hash, and query params. Editing params rebuilds the URL in-browser.",
  },
  {
    slug: "cidr-calculator",
    name: "CIDR Calculator",
    description: "Calculate network, broadcast, and host ranges from CIDR.",
    category: "http",
    keywords: ["cidr", "subnet", "ip", "network"],
    info: "IPv4 (and IPv6 when provided) subnet math via ipaddr.js. No WHOIS or remote lookup.",
  },
  {
    slug: "chmod-calculator",
    name: "Chmod Calculator",
    description: "Convert between octal and symbolic Unix permissions.",
    category: "http",
    keywords: ["chmod", "permissions", "unix", "755"],
    info: "Interactive ugo rwx ↔ octal (e.g. 755) ↔ symbolic mode. Does not apply permissions to files.",
  },
  {
    slug: "cert-inspector",
    name: "Certificate Inspector",
    description: "Inspect a pasted X.509 PEM certificate locally.",
    category: "http",
    keywords: ["tls", "ssl", "certificate", "pem", "x509"],
    info: "Paste a PEM certificate to view subject, issuer, dates, SANs, and fingerprint. Does not fetch remote host certificates (no network).",
  },

  // Media
  {
    slug: "image-converter",
    name: "Image Converter",
    description: "Convert, resize, or generate favicon PNGs in your browser.",
    category: "media",
    keywords: ["image", "png", "jpeg", "webp", "favicon", "icon"],
    info: "Convert tab: upload/drop an image, optionally resize, export PNG/JPEG/WebP via canvas. Favicon tab: export common sizes (16–180) as PNG. Processing stays local; very large images may be memory-heavy.",
  },
  {
    slug: "qr-code",
    name: "QR Code",
    description: "Generate QR codes from text or URLs.",
    category: "media",
    keywords: ["qr", "barcode"],
    info: "Renders a QR code from text/URL. Size and error-correction affect scannability vs density. Download as PNG.",
  },
  {
    slug: "color-picker",
    name: "Color Picker",
    description: "HSV picker with alpha, CSS formats, eyedropper, and image sampling.",
    category: "media",
    keywords: ["color", "hex", "rgb", "hsl", "eyedropper", "alpha"],
    info: "Pick via SV plane, hue/alpha sliders, or RGB/HEX inputs. Copy rgb/rgba/hex/hex8/hsl/hsla. Chromium eyedropper samples the screen. Upload an image and hover to sample pixels (click to lock).",
  },
  {
    slug: "svg-converter",
    name: "SVG Converter",
    description: "Preview SVG and export PNG in your browser.",
    category: "media",
    keywords: ["svg", "png", "vector"],
    info: "Paste or upload SVG, preview, download SVG, or rasterize to PNG via canvas. Complex filters/fonts may differ from desktop renderers.",
  },
  // Misc
  {
    slug: "units-converter",
    name: "Units Converter",
    description: "Live multi-field converter for time, data size, length, and more.",
    category: "misc",
    keywords: ["units", "convert"],
    info: "Tabbed live converter: editing one field updates the rest. Time/data-size use exact binary or SI factors as labeled. Calendar month/year averages are approximate.",
  },
  {
    slug: "ascii-art",
    name: "ASCII Art",
    description: "Render text as FIGlet-style ASCII art.",
    category: "misc",
    keywords: ["ascii", "art", "banner", "figlet"],
    info: "Renders banner text with a curated set of FIGlet fonts. Very long input may produce huge output — keep phrases short.",
  },
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
      t.info.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.includes(q)) ||
      t.slug.includes(q),
  );
}
