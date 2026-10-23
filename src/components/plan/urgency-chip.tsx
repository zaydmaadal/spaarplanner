import { URGENCY_LABEL, type Urgency } from "@/domain/checklist-rules";
import { cn } from "@/lib/utils";

// The urgency in words; the colour only backs it up (week: outlined in the error colour, month: warm, later: quiet).
const TONE: Record<Urgency, string> = {
  week: "border border-error text-error",
  month: "bg-warn-bg text-warn-ink",
  later: "bg-tint text-ink",
};

export function UrgencyChip({ urgency, as: Tag = "span", className }: { urgency: Urgency; as?: "span" | "h3"; className?: string }) {
  return <Tag className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", TONE[urgency], className)}>{URGENCY_LABEL[urgency]}</Tag>;
}
