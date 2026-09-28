"use client";

import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { Search, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";

import { toolsRegistry } from "@/data/tools-registry";
import { siteConfig } from "@/lib/site";
import { CATEGORY_LABELS, type ToolCategory } from "@/types/tool";

const categoryOrder: ToolCategory[] = [
  "cloud",
  "encoding",
  "crypto",
  "ids",
  "data",
  "http",
  "media",
  "documents",
  "indonesia",
  "misc",
];

export type ToolsMotionTheme = "terminal" | "workshop" | "signal";

function MagneticCard({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18 });
  const sy = useSpring(y, { stiffness: 200, damping: 18 });
  const srx = useSpring(rotateX, { stiffness: 200, damping: 18 });
  const sry = useSpring(rotateY, { stiffness: 200, damping: 18 });

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    x.set(px * 10);
    y.set(py * 10);
    rotateX.set(py * -8);
    rotateY.set(px * 10);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.a
      href={href}
      style={{ x: sx, y: sy, rotateX: srx, rotateY: sry, transformPerspective: 600 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
    >
      {children}
    </motion.a>
  );
}

function SpotlightCard({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const background = useMotionTemplate`radial-gradient(320px circle at ${mx}px ${my}px, rgba(16,185,129,0.18), transparent 55%)`;

  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden ${className}`}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
    >
      <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background }} />
      <div className="relative">{children}</div>
    </Link>
  );
}

export function ToolsPreviewShell({
  theme,
  title,
  blurb,
}: {
  theme: ToolsMotionTheme;
  title: string;
  blurb: string;
}) {
  const featured = useMemo(() => toolsRegistry.slice(0, 12), []);
  const [boot, setBoot] = useState(true);
  const [typed, setTyped] = useState("");
  const [activeCat, setActiveCat] = useState<ToolCategory | "all">("all");
  const [indexed, setIndexed] = useState(0);

  const fullTitle = siteConfig.name;

  useEffect(() => {
    setBoot(true);
    setTyped("");
    setIndexed(0);
    const bootTimer = window.setTimeout(() => setBoot(false), theme === "terminal" ? 1600 : 900);
    return () => window.clearTimeout(bootTimer);
  }, [theme]);

  useEffect(() => {
    if (boot || theme !== "terminal") return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(fullTitle.slice(0, i));
      if (i >= fullTitle.length) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [boot, theme, fullTitle]);

  useEffect(() => {
    if (boot) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setIndexed(Math.min(toolsRegistry.length, n * 3));
      if (n * 3 >= toolsRegistry.length) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [boot, theme]);

  const visible = featured.filter((t) => activeCat === "all" || t.category === activeCat);

  if (theme === "terminal") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,.4)_3px)]" />

        <AnimatePresence>
          {boot ? (
            <motion.div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black font-mono text-emerald-400"
              exit={{ opacity: 0 }}
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm"
              >
                mounting tools filesystem…
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-emerald-400" />
              </motion.p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[11px] tracking-[0.2em] text-emerald-400 uppercase"
          >
            Preview · Terminal Lab · motion-first
          </motion.p>
          <h1 className="mt-3 min-h-[3.5rem] font-mono text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {typed}
            <span className="ml-0.5 inline-block h-[0.9em] w-2 translate-y-1 animate-pulse bg-emerald-400 align-baseline" />
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400"
          >
            {blurb}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-2 font-mono text-xs text-emerald-500/80"
          >
            indexed {indexed}/{toolsRegistry.length} utilities
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 220, damping: 24 }}
            className="mt-8 rounded-2xl border border-emerald-500/20 bg-zinc-900/60 p-4"
          >
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-500">
              <Search className="size-4 text-emerald-400" />
              Search tools… <span className="ml-auto font-mono text-[10px]">live filter demo ↓</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip
                active={activeCat === "all"}
                onClick={() => setActiveCat("all")}
                tone="emerald"
              >
                all
              </Chip>
              {categoryOrder.map((c) => (
                <Chip
                  key={c}
                  active={activeCat === c}
                  onClick={() => setActiveCat(c)}
                  tone="emerald"
                >
                  {CATEGORY_LABELS[c]}
                </Chip>
              ))}
            </div>
          </motion.div>

          <motion.div layout className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visible.map((tool, i) => (
                <motion.div
                  key={tool.slug}
                  layout
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ delay: Math.min(i, 8) * 0.04, type: "spring", stiffness: 320, damping: 26 }}
                >
                  <SpotlightCard
                    href={`/t/${tool.slug}`}
                    className="group block rounded-2xl border border-white/10 bg-zinc-900/50 p-4 transition hover:border-emerald-500/40"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      {CATEGORY_LABELS[tool.category]}
                    </p>
                    <h2 className="mt-1 text-base font-medium text-white">{tool.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{tool.description}</p>
                  </SpotlightCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    );
  }

  if (theme === "workshop") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-stone-100 text-stone-900">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <AnimatePresence>
          {boot ? (
            <motion.div
              className="fixed inset-0 z-40 flex items-center justify-center bg-stone-100"
              exit={{ clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className="h-px w-40 origin-left bg-teal-800"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[11px] tracking-[0.18em] text-teal-800 uppercase"
          >
            Preview · Workshop · paper unfold
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 180, damping: 20 }}
            className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl"
          >
            {siteConfig.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 max-w-xl text-sm leading-relaxed text-stone-500 sm:text-base"
          >
            {blurb}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-10 rounded-3xl border border-stone-300/80 bg-white/80 p-5 shadow-sm backdrop-blur"
          >
            <div className="flex items-center gap-2 text-stone-400">
              <Search className="size-4" />
              <span className="text-sm">Search the workbench…</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip active={activeCat === "all"} onClick={() => setActiveCat("all")} tone="teal">
                All
              </Chip>
              {categoryOrder.map((c) => (
                <Chip
                  key={c}
                  active={activeCat === c}
                  onClick={() => setActiveCat(c)}
                  tone="teal"
                >
                  {CATEGORY_LABELS[c]}
                </Chip>
              ))}
            </div>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1000 }}>
            {visible.map((tool, i) => (
              <motion.div
                key={tool.slug}
                initial={{ opacity: 0, rotateX: 12, y: 30 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 200, damping: 22 }}
              >
                <MagneticCard
                  href={`/t/${tool.slug}`}
                  className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
                    {CATEGORY_LABELS[tool.category]}
                  </p>
                  <h2 className="mt-1 text-lg font-medium">{tool.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-stone-500">{tool.description}</p>
                  <span className="mt-3 inline-block h-px w-8 bg-teal-700/60" />
                </MagneticCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Signal Board
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full border border-amber-400/10"
        animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.15, 0.35] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[80px] h-64 w-px origin-top bg-gradient-to-b from-amber-400/50 to-transparent"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "top center" }}
      />

      <AnimatePresence>
        {boot ? (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-slate-950"
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="size-10 rounded-full border-2 border-amber-400/40 border-t-amber-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <p className="font-mono text-xs tracking-widest text-amber-400/80 uppercase">
              syncing signal board
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-amber-400 uppercase"
            >
              <Zap className="size-3" /> Preview · Signal Board
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl"
            >
              {siteConfig.name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-3 max-w-xl text-sm text-slate-400"
            >
              {blurb}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-mono text-xs text-amber-200"
          >
            <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-amber-400" />
            {toolsRegistry.length} channels online
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]"
        >
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Search className="size-4 text-amber-400" />
              Query utilities…
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip active={activeCat === "all"} onClick={() => setActiveCat("all")} tone="amber">
                ALL
              </Chip>
              {categoryOrder.map((c) => (
                <Chip
                  key={c}
                  active={activeCat === c}
                  onClick={() => setActiveCat(c)}
                  tone="amber"
                >
                  {CATEGORY_LABELS[c]}
                </Chip>
              ))}
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4"
          >
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-slate-500 uppercase">
              <Sparkles className="size-3 text-amber-400" /> telemetry
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{indexed}</p>
            <p className="text-xs text-slate-500">tools indexed this session</p>
          </motion.div>
        </motion.div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((tool, i) => (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, type: "spring", stiffness: 280, damping: 24 }}
            >
              <Link
                href={`/t/${tool.slug}`}
                className="group relative block overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 transition hover:border-amber-500/40"
              >
                <motion.span
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {CATEGORY_LABELS[tool.category]}
                  </p>
                  <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </div>
                <h2 className="mt-1 text-base font-medium group-hover:text-amber-100">{tool.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{tool.description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  tone,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  tone: "emerald" | "teal" | "amber";
}) {
  const tones = {
    emerald: active
      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
      : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200",
    teal: active
      ? "border-teal-800/40 bg-teal-800/15 text-teal-900"
      : "border-stone-300 bg-white text-stone-500 hover:text-stone-800",
    amber: active
      ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
      : "border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200",
  };

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${tones[tone]}`}
    >
      {children}
    </motion.button>
  );
}
