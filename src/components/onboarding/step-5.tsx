"use client";

import { useState } from "react";
import { MoneyField } from "@/components/form-fields";
import { Money } from "@/components/money";
import { deleteBudgetLineAction, saveBudgetLineAction } from "@/data/actions/budget";
import { savePlanAction } from "@/data/actions/plan";
import { budgetWarnings, monthlyBudget, savingsTarget } from "@/domain/budget";
import { formatEUR, parseEuroInput, toEuroInput } from "@/domain/money";
import type { BudgetLine, Income, PlanSettings } from "@/domain/types";
import { deleteRows, saveRows, useRows, type Errors, type Row } from "./rows";
import { outcome, StepShell, type Mode } from "./step-shell";

type Spend = Row & { name: string; kind: "living" | "free"; amount: string; isEstimate: boolean };

// A fixed set, so the form stays short. Other living or free lines (made elsewhere) are left alone.
const GROUPS: { legend: string; items: { name: string; kind: Spend["kind"] }[] }[] = [
  { legend: "Leven", items: [{ name: "Eten", kind: "living" }, { name: "Vervoer", kind: "living" }] },
  { legend: "Vrije tijd", items: [{ name: "Uitgaan", kind: "free" }, { name: "Hobby's", kind: "free" }] },
];
const ITEMS = GROUPS.flatMap((g) => g.items);

export function Step5({ mode, incomes, lines, plan }: { mode: Mode; incomes: Income[]; lines: BudgetLine[]; plan: PlanSettings }) {
  const spends = useRows<Spend>(
    ITEMS.map((item) => {
      const stored = lines.find((l) => l.name === item.name && l.kind === item.kind);
      return { key: item.name, id: stored?.id, name: item.name, kind: item.kind, amount: stored ? toEuroInput(stored.amountCents) : "", isEstimate: stored?.isEstimate ?? true };
    }),
  );
  const storedSavings = plan.monthlySavingsCents === null ? null : toEuroInput(plan.monthlySavingsCents);
  // null: the user has not typed an amount, so the field shows the proposal and nothing is stored.
  const [typed, setTyped] = useState(storedSavings);
  const [errors, setErrors] = useState<Record<string, Errors>>({});
  const [planErrors, setPlanErrors] = useState<Errors>({});

  const own = new Set<string>(ITEMS.map((i) => `${i.kind}:${i.name}`));
  const filled = spends.rows.flatMap((r) => {
    const cents = r.amount.trim() ? parseEuroInput(r.amount) : null;
    return cents === null ? [] : [{ id: r.key, kind: r.kind, category: "", name: r.name, amountCents: cents, isEstimate: r.isEstimate }];
  });
  const all = [...lines.filter((l) => !own.has(`${l.kind}:${l.name}`)), ...filled];
  const budget = monthlyBudget(incomes, all, plan.incomeMode);
  const proposal = savingsTarget({ ...plan, monthlySavingsCents: null }, budget, all.length > 0);
  const want = typed === null ? null : typed.trim() ? parseEuroInput(typed) : null;
  const warnings = budgetWarnings({ ...plan, monthlySavingsCents: want }, budget);

  async function save() {
    const saved = await saveRows(
      spends.rows.filter((r) => r.amount.trim()),
      (r) => saveBudgetLineAction({ id: r.id, kind: r.kind, category: "", name: r.name, amount: r.amount, isEstimate: r.isEstimate }),
      (key, id) => spends.patch(key, { id }),
    );
    setErrors(saved.errors);
    const blank = spends.rows.flatMap((r) => (!r.amount.trim() && r.id ? [r.id] : []));
    let message = saved.message ?? (await deleteRows(blank, deleteBudgetLineAction, (id) => spends.patch(spends.rows.find((r) => r.id === id)!.key, { id: undefined })));
    // Only an amount the user typed is stored, never the proposal; a blank field means "follow my room".
    if (typed !== null && typed !== storedSavings) {
      message ??= outcome(await savePlanAction({ monthlySavings: typed.trim() ? typed : null }), setPlanErrors);
    }
    return message;
  }

  return (
    <StepShell mode={mode} step={5} title="Wat geef je uit en wat spaar je?" intro="Vul per maand ongeveer in wat je uitgeeft. Een schatting is goed genoeg." save={save}>
      {GROUPS.map((group) => (
        <fieldset key={group.legend} className="flex flex-col gap-4">
          <legend className="mb-3 font-display text-lg font-semibold">{group.legend}</legend>
          {group.items.map((item) => (
            <MoneyField key={item.name} label={item.name} value={spends.rows.find((r) => r.key === item.name)!.amount} onChange={(amount) => spends.patch(item.name, { amount })} error={errors[item.name]?.amount} />
          ))}
        </fieldset>
      ))}
      <div className="flex flex-col gap-1 border-t border-hairline pt-4">
        <p className="text-sm font-semibold text-ink-2">Dit blijft er per maand over</p>
        <Money cents={budget.roomCents} className="text-[32px] leading-tight" />
      </div>
      {warnings.map((w) => (
        <p key={w.key} role="status" className="rounded-strip bg-warn-bg p-3 text-sm font-semibold text-warn-ink">
          {w.key === "negative_budget" ? "Je geeft meer uit dan je verdient. Kijk je vaste kosten na." : `Je wil ${formatEUR(w.wantCents)} sparen maar houdt ${formatEUR(w.roomCents)} over.`}
        </p>
      ))}
      <MoneyField
        label="Dit wil ik sparen"
        hint={proposal.isProposal ? "Ons voorstel: 20 % van wat je binnenkrijgt. Pas het aan als je meer of minder wil sparen." : "Dit is wat er overblijft. Pas het aan als je minder wil sparen."}
        value={typed ?? toEuroInput(proposal.cents)}
        onChange={setTyped}
        error={planErrors.monthlySavings}
      />
    </StepShell>
  );
}
