import type { Metadata } from "next";

import { HomePageClient } from "@/app/(app)/home-page-client";

export const metadata: Metadata = {
  title: "Preview · Terminal Lab",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="mb-6 font-mono text-[11px] tracking-wider text-emerald-400/80 uppercase">
        Preview · same as home · no bootloader
      </p>
      <HomePageClient />
    </div>
  );
}
