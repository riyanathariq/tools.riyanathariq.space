import type { MetadataRoute } from "next";

import { toolsRegistry } from "@/data/tools-registry";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const home: MetadataRoute.Sitemap[number] = {
    url: siteConfig.url,
    lastModified,
    changeFrequency: "weekly",
    priority: 1,
  };

  const tools: MetadataRoute.Sitemap = toolsRegistry.map((tool) => ({
    url: `${siteConfig.url}/t/${tool.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: tool.cloud ? 0.8 : 0.7,
  }));

  return [home, ...tools];
}
