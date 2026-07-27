"use client";

import { notFound, useParams } from "next/navigation";
import { Suspense, useEffect, useState, type ComponentType } from "react";

import { ToolsShell } from "@/components/tools-shell";
import { getToolBySlug } from "@/data/tools-registry";
import { pushRecentToolSlug } from "@/lib/recent-tools";
import { loadToolComponent } from "@/tools/load-tool";

function ToolLoader({ slug }: { slug: string }) {
  const tool = getToolBySlug(slug);
  // Store component inside an object so setState never treats it as an updater fn.
  const [loaded, setLoaded] = useState<{ Comp: ComponentType } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tool) return;
    let cancelled = false;
    setLoaded(null);
    setError(null);
    pushRecentToolSlug(slug);
    loadToolComponent(slug)
      .then((Comp) => {
        if (!cancelled) setLoaded({ Comp });
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

  if (!loaded) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <p className="animate-pulse text-sm text-zinc-500">Loading tool…</p>
      </div>
    );
  }

  const { Comp } = loaded;
  return <Comp />;
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

  if (!slug) {
    return (
      <ToolsShell title="Loading…">
        <div className="flex min-h-[20rem] items-center justify-center">
          <p className="animate-pulse text-sm text-zinc-500">Loading…</p>
        </div>
      </ToolsShell>
    );
  }

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
