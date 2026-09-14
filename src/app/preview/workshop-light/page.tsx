import type { Metadata } from "next";

import { ToolsPreviewShell } from "@/components/preview/tools-preview-shell";

export const metadata: Metadata = {
  title: "Preview · Workshop Light",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ToolsPreviewShell
      theme="workshop"
      title="Workshop Light"
      blurb="Paper curtain reveal, spring typography, and magnetic tilt cards — a workbench that moves, not just a light theme."
    />
  );
}
