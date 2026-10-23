import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

/** Falls back to the placeholder as the accessible name when no label is wired up. */
function fallbackLabel(props: InputHTMLAttributes<HTMLInputElement>) {
  if (props["aria-label"] || props["aria-labelledby"] || props.id) return undefined;
  return props.placeholder?.replace(/…$/, "").trim() || undefined;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-label={fallbackLabel(props)}
        className={cn(
          "h-11 w-full rounded-xl border border-line-strong bg-sunken px-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/30 read-only:border-line read-only:focus:border-line read-only:focus:ring-0",
          className,
        )}
        {...props}
      />
    );
  },
);
