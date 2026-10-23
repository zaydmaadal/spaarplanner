import { cn } from "@/lib/utils";

// A sun rising over a horizon: the brand mark. Colours come from the palette tokens.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={cn("size-9", className)}>
      <rect width="32" height="32" rx="10" className="fill-hero-bg" />
      <path d="M8 21a8 8 0 0 1 16 0z" className="fill-spark" />
      <rect x="6" y="23.5" width="20" height="2.5" rx="1.25" className="fill-hero-ink" />
    </svg>
  );
}
