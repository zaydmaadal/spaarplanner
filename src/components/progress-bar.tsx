import { cn } from "@/lib/utils";

// A CSS colour that must come from a design token, e.g. "var(--color-pot-1)".
export type TokenColor = `var(--color-${string})`;

export const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

// The bar has no text of its own: show the amounts next to it, so the meaning never rests on colour.
export function ProgressBar({
  value,
  label,
  color = "var(--color-progress)",
  className,
}: {
  value: number;
  label: string;
  color?: TokenColor;
  className?: string;
}) {
  const fraction = clamp01(value);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-tint", className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-(--duration-3) ease-standard"
        style={{ width: `${fraction * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}
