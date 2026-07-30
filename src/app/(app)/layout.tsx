"use client";

import { AuthProvider } from "@/components/auth-provider";
import { ToolsShell } from "@/components/tools-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToolsShell>{children}</ToolsShell>
    </AuthProvider>
  );
}
