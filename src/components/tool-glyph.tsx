import { cn } from "@/lib/utils";

const GLYPHS: Record<string, string> = {
  base64: "64",
  "url-encoding": "%",
  "html-entities": "&;",
  "json-escape": "\\n",
  hashing: "#",
  hmac: "HM",
  jwt: "JWT",
  "key-generator": "key",
  "password-generator": "***",
  "password-hash": "bc",
  uuid: "ID",
  ulid: "UL",
  cron: "* *",
  datetime: "dt",
  "timezone-planner": "tz",
  "json-prettier": "{ }",
  "json-path": "$.",
  regex: ".*",
  "text-diff": "±",
  "text-case": "Aa",
  "text-toolkit": "Tt",
  "sql-format": "SQL",
  "lorem-ipsum": "Lo",
  "markdown-preview": "md",
  "yaml-json": "yml",
  "env-toml": "env",
  "openapi-viewer": "API",
  "curl-explainer": "$_",
  "url-parser": "://",
  "cidr-calculator": "/24",
  "chmod-calculator": "rwx",
  "cert-inspector": "crt",
  "image-converter": "img",
  "qr-code": "QR",
  "color-picker": "#fff",
  "svg-converter": "svg",
  "pdf-merge": "pdf",
  "pdf-split": "pdf",
  "pdf-organize": "pdf",
  "images-to-pdf": "pdf",
  "pdf-to-images": "pdf",
  "pdf-compress": "pdf",
  "wilayah-lookup": "ID",
  "wilayah-api": "API",
  "wilayah-explorer": "ID",
  "units-converter": "u",
  "ascii-art": "A/",
  "smtp-tester": "@",
  "webhook-bin": "POST",
};

export function glyphFor(slug: string, name: string) {
  return GLYPHS[slug] ?? name.slice(0, 2).toLowerCase();
}

export function ToolGlyph({
  slug,
  name,
  premium,
  active,
  className,
}: {
  slug: string;
  name: string;
  premium?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl font-mono text-[13px] font-medium",
        active
          ? "bg-accent text-on-accent"
          : premium
            ? "bg-premium-soft text-premium-ink"
            : "bg-accent-soft text-accent-ink",
        className,
      )}
    >
      {glyphFor(slug, name)}
    </span>
  );
}
