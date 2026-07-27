"use client";

import { ToolsShell } from "@/components/tools-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ToolsShell>{children}</ToolsShell>;
}
