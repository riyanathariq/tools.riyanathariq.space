import { ToolsPreviewBar } from "@/components/preview/preview-bar";

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ToolsPreviewBar />
      {children}
    </div>
  );
}
