import type { Metadata } from "next";

import { ToolsPreviewShell } from "@/components/preview/tools-preview-shell";

export const metadata: Metadata = {
  title: "Preview · Signal Board",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ToolsPreviewShell
      theme="signal"
      title="Signal Board"
      blurb="Radar sweep, sync boot, telemetry counters, and cascading channel cards — ops board choreography."
    />
  );
}
