import { formatEUR } from "@/domain/money";
import { cn } from "@/lib/utils";

export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={cn("font-semibold whitespace-nowrap tabular-nums", className)}>{formatEUR(cents)}</span>;
}
