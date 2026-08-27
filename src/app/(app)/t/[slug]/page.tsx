import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ToolPageClient } from "@/app/(app)/t/[slug]/tool-page-client";
import { JsonLd } from "@/components/json-ld";
import { getToolBySlug, toolsRegistry } from "@/data/tools-registry";
import { buildToolMetadata, toolJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return toolsRegistry.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) {
    return {
      title: "Tool not found",
      robots: { index: false, follow: false },
    };
  }
  return buildToolMetadata(tool);
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  return (
    <>
      <JsonLd data={toolJsonLd(tool)} />
      {/* Extra crawlable copy; visible H1 comes from ToolHeader */}
      <p className="sr-only">
        {tool.description} {tool.info}
      </p>
      <ToolPageClient />
    </>
  );
}
