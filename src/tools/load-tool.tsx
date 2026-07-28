import type { ComponentType } from "react";

type ToolModule = Record<string, ComponentType>;

function pickComponent(mod: ToolModule, slug: string): ComponentType {
  const name = slugToExport(slug);
  const component = mod[name];
  if (!component) {
    throw new Error(`Tool component "${name}" not found for slug "${slug}"`);
  }
  return component;
}

export async function loadToolComponent(slug: string): Promise<ComponentType> {
  switch (slug) {
    // Encoding
    case "base64":
    case "base32":
    case "url-encoding":
    case "url-base64":
    case "mime-base64":
    case "html-entities":
    case "json-escape":
    case "xml-escape":
    case "csv-escape":
    case "escape-sequences":
      return pickComponent(await import("@/tools/encoding"), slug);

    // Crypto
    case "hashing":
    case "hmac":
    case "jwt":
    case "key-generator":
    case "password-generator":
      return pickComponent(await import("@/tools/crypto"), slug);
    case "password-hash":
      return pickComponent(await import("@/tools/extra-crypto"), slug);

    // IDs & time
    case "uuid":
    case "ulid":
    case "nanoid":
    case "cron":
    case "datetime":
      return pickComponent(await import("@/tools/ids"), slug);
    case "uuid-ulid":
    case "timezone-planner":
      return pickComponent(await import("@/tools/extra-ids"), slug);

    // Data & text
    case "json-prettier":
    case "json-path":
    case "json-schema":
    case "regex":
    case "text-diff":
    case "text-case":
    case "text-statistic":
    case "text-filter":
    case "text-sorting":
    case "text-format":
    case "sql-format":
    case "lorem-ipsum":
    case "code-format":
      return pickComponent(await import("@/tools/data"), slug);
    case "markdown-preview":
    case "yaml-json":
    case "env-toml":
    case "graphql-format":
    case "openapi-viewer":
    case "url-parser":
      return pickComponent(await import("@/tools/extra-data"), slug);

    // HTTP & CLI
    case "curl-explainer":
    case "cli-helpers":
      return pickComponent(await import("@/tools/http"), slug);
    case "cidr-calculator":
    case "chmod-calculator":
      return pickComponent(await import("@/tools/extra-net"), slug);
    case "cert-inspector":
      return pickComponent(await import("@/tools/extra-crypto"), slug);

    // Media
    case "image-converter":
    case "qr-code":
      return pickComponent(await import("@/tools/media"), slug);
    case "color-picker":
      return pickComponent(await import("@/tools/color-picker"), slug);
    case "svg-converter":
    case "favicon-generator":
      return pickComponent(await import("@/tools/extra-media"), slug);

    // Misc
    case "units-converter":
    case "ascii-encoding":
    case "ascii-art":
    case "rubber-duck":
      return pickComponent(await import("@/tools/misc"), slug);

    default:
      throw new Error(`Unknown tool slug: ${slug}`);
  }
}

function slugToExport(slug: string): string {
  return slug
    .split("-")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}
