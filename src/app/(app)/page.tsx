import type { Metadata } from "next";

import { HomePageClient } from "@/app/(app)/home-page-client";
import { JsonLd } from "@/components/json-ld";
import { toolsRegistry } from "@/data/tools-registry";
import { homeJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} · Free Online Utilities · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: `${siteConfig.name} · Free Online Utilities`,
    description: siteConfig.description,
    url: siteConfig.url,
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd(toolsRegistry)} />
      <HomePageClient />
    </>
  );
}
