import { formatEUR } from "@/domain/money";
import type { BudgetWarning } from "@/domain/budget";

// The warnings of budgetWarnings(): spending more than comes in, or wanting to save more than is left.
export function BudgetWarnings({ warnings }: { warnings: BudgetWarning[] }) {
  return warnings.map((w) => (
    <p key={w.key} role="status" className="rounded-strip bg-warn-bg p-3 text-sm font-semibold text-warn-ink">
      {w.key === "negative_budget" ? "Je geeft meer uit dan je verdient. Kijk je vaste kosten na." : `Je wil ${formatEUR(w.wantCents)} sparen maar houdt ${formatEUR(w.roomCents)} over.`}
    </p>
  ));
}
