import { cn } from "@/lib/utils";

// Two stacked coins with a sprout: money that grows. The brand mark; its colours come from the palette tokens.
// src/app/icon.svg and public/icons are the same drawing in nachtblauw (scripts/generate-icons.mjs).
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={cn("size-9", className)}>
      <rect width="32" height="32" rx="8" className="fill-hero-bg" />
      <path d="M16 16.5C10 17 7.5 12.8 7.5 7.5c6-.2 8.5 3.2 8.5 9z" className="fill-spark" />
      <path d="M16 13.5c0-4.6 2.4-7.7 8.5-7.8 0 5.1-2.4 8.3-8.5 7.8z" className="fill-spark" />
      <rect x="6" y="19" width="20" height="4" rx="2" className="fill-hero-ink" />
      <rect x="6" y="24.5" width="20" height="4" rx="2" className="fill-hero-ink" />
    </svg>
  );
}
