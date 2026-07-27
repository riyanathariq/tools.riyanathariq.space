"use client";

import { notFound, useParams } from "next/navigation";
import { Suspense, useEffect, useState, type ComponentType } from "react";

import { ToolsShell } from "@/components/tools-shell";
import { getToolBySlug } from "@/data/tools-registry";
import { pushRecentToolSlug } from "@/lib/recent-tools";
import { loadToolComponent } from "@/tools/load-tool";

function ToolLoader({ slug }: { slug: string }) {
  const tool = getToolBySlug(slug);
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tool) return;
    let cancelled = false;
    pushRecentToolSlug(slug);
    loadToolComponent(slug)
      // Wrap in updater factory — React treats bare function args as setState updaters.
      .then((Comp) => {
        if (!cancelled) setComponent(() => Comp);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load tool");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, tool]);

  if (!tool) {
    notFound();
  }

  if (error) {
    return (
      <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
        {error}
      </p>
    );
  }

  if (!Component) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <p className="animate-pulse text-sm text-zinc-500">Loading tool…</p>
      </div>
    );
  }

  return <Component />;
}

function ToolPageInner({ slug }: { slug: string }) {
  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  return (
    <ToolsShell activeSlug={slug} title={tool.name}>
      <ToolLoader slug={slug} />
    </ToolsShell>
  );
}

export default function ToolPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  return (
    <Suspense
      fallback={
        <ToolsShell title="Loading…">
          <div className="flex min-h-[20rem] items-center justify-center">
            <p className="animate-pulse text-sm text-zinc-500">Loading…</p>
          </div>
        </ToolsShell>
      }
    >
      <ToolPageInner slug={slug} />
    </Suspense>
  );
}
