import type { incomeSchema } from "@/data/schemas";
import { toEuroInput } from "@/domain/money";
import type { Income } from "@/domain/types";
import type { z } from "zod";

// saveIncomeAction replaces the whole income: a field that is left out resets to its default. A form that edits only some
// fields (name, kind, amount, how often) sends the rest back as it is stored, so saving never changes what the user did not
// touch. A new income has nothing stored and gets the defaults, with no fixed payday. A payday rule only makes sense for the
// rhythm it was made for, so it is not carried over to another frequency.
export function keptIncomeFields(stored: Income | undefined, frequency: Income["frequency"]): Pick<z.input<typeof incomeSchema>, "variability" | "amountLow" | "isEstimate" | "active" | "paydayRule"> {
  const irregular = { type: "irregular" } as const;
  if (!stored) return { paydayRule: irregular };
  return {
    variability: stored.variability,
    amountLow: stored.amountLowCents === null ? null : toEuroInput(stored.amountLowCents),
    isEstimate: stored.isEstimate,
    active: stored.active,
    paydayRule: stored.frequency === frequency ? stored.paydayRule : irregular,
  };
}
