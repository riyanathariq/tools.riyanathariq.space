import Link from "next/link";
import type { Metadata } from "next";

import { TOOLS_PREVIEW_OPTIONS } from "@/components/preview/options";

export const metadata: Metadata = {
  title: "Design previews",
  robots: { index: false, follow: false },
};

export default function PreviewHubPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-xs tracking-widest text-emerald-400 uppercase">Local only · not indexed</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose a look for tools.riyanathariq.space</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Tiga shell visual di atas katalog tools asli. Production tetap seperti sekarang sampai kamu pilih.
        </p>
        <ul className="mt-8 space-y-3">
          {TOOLS_PREVIEW_OPTIONS.map((opt) => (
            <li key={opt.id}>
              <Link
                href={opt.href}
                className="block rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition hover:border-emerald-500/40"
              >
                <h2 className="text-lg font-medium">{opt.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">{opt.tagline}</p>
                <p className="mt-2 text-sm text-zinc-400">{opt.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
