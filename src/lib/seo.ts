import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";
import { CATEGORY_LABELS, type ToolMeta } from "@/types/tool";

function truncate(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

/** Search-friendly title (~50–60 chars). */
export function toolSeoTitle(tool: ToolMeta): string {
  const base = `${tool.name} Online`;
  const suffix = " — Free Tool";
  if (base.length + suffix.length <= 60) return `${base}${suffix}`;
  return truncate(`${tool.name} — Free Online Tool`, 60);
}

/** Meta description aimed at Google snippets (~150–160 chars). */
export function toolSeoDescription(tool: ToolMeta): string {
  const privacy = tool.cloud
    ? "Sign-in required for this cloud tool."
    : "Runs in your browser — private, no upload.";
  return truncate(`${tool.description} ${privacy} Free on ${siteConfig.shortName}.`, 160);
}

export function toolAbsoluteUrl(slug: string): string {
  return `${siteConfig.url}/t/${slug}`;
}

export function buildToolMetadata(tool: ToolMeta): Metadata {
  const title = toolSeoTitle(tool);
  const description = toolSeoDescription(tool);
  const url = toolAbsoluteUrl(tool.slug);
  const keywords = [
    ...tool.keywords,
    tool.name,
    CATEGORY_LABELS[tool.category],
    "online",
    "free",
    "developer tools",
    "web tool",
  ];

  return {
    title,
    description,
    keywords,
    authors: [{ name: siteConfig.author, url: siteConfig.authorUrl }],
    creator: siteConfig.author,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: siteConfig.shortName,
      locale: siteConfig.locale,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function toolJsonLd(tool: ToolMeta) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    description: tool.description,
    url: toolAbsoluteUrl(tool.slug),
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: siteConfig.author,
      url: siteConfig.authorUrl,
    },
    isAccessibleForFree: true,
    keywords: tool.keywords.join(", "),
  };
}

export function homeJsonLd(tools: ToolMeta[]) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    author: {
      "@type": "Person",
      name: siteConfig.author,
      url: siteConfig.authorUrl,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        url: toolAbsoluteUrl(tool.slug),
        description: tool.description,
      })),
    },
  };
}
