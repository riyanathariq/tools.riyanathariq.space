import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

/** Falls back to the placeholder as the accessible name when no label is wired up. */
function fallbackLabel(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  if (props["aria-label"] || props["aria-labelledby"] || props.id) return undefined;
  return props.placeholder?.replace(/…$/, "").trim() || undefined;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      aria-label={fallbackLabel(props)}
      className={cn(
        "min-h-40 w-full resize-y rounded-xl border border-line-strong bg-sunken px-3 py-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/30 read-only:border-line read-only:focus:border-line read-only:focus:ring-0",
        className,
      )}
      {...props}
    />
  );
}
