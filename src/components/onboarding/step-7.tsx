"use client";

import { useId, useState } from "react";
import { Choice, Item, MoneyField, TextField, Toggles } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { addChecklistItemAction } from "@/data/actions/checklist";
import { archiveGoalAction, saveGoalAction, setMainGoalAction } from "@/data/actions/goals";
import { savePlanAction } from "@/data/actions/plan";
import { monthlyBudget, savingsTarget, suggestedEmergencyTarget } from "@/domain/budget";
import { formatMonthNl } from "@/domain/dates";
import { formatEUR, parseEuroInput, toEuroInput } from "@/domain/money";
import { currentPeriod, primaryPaydayRule } from "@/domain/payday";
import type { BudgetLine, Cents, Goal, Income, ISODate, PlanSettings, YearMonth } from "@/domain/types";
import { deleteRows, saveRows, useRows, type Errors, type Row } from "./rows";
import { StepShell, type Mode } from "./step-shell";
import { previewTimeline, type PreviewLine } from "./timeline";

type Kind = "savings" | "trip" | "purchase" | "other";
type Pot = Row & { preset?: string; kind: Kind; name: string; amount: string; estimate: boolean; deadline: string; weight: number; isMain: boolean };

// The amounts are estimates until the user types the real price.
const PRESETS: { id: string; name: string; kind: Kind; cents: Cents }[] = [
  { id: "reis", name: "Reis", kind: "trip", cents: 150000 },
  { id: "rijbewijs", name: "Rijbewijs", kind: "purchase", cents: 150000 },
  { id: "laptop", name: "Laptop", kind: "purchase", cents: 100000 },
  { id: "auto", name: "Auto", kind: "purchase", cents: 800000 },
  { id: "huwelijk", name: "Huwelijk", kind: "other", cents: 1000000 },
  { id: "hajj", name: "Hajj", kind: "other", cents: 700000 },
];
const STAGE = "Stage vinden";
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const toYearMonth = (text: string): YearMonth | null => (MONTH.test(text) ? { year: Number(text.slice(0, 4)), month: Number(text.slice(5)) } : null);

const fillText = (line: PreviewLine, years: number) => (line.fill === "full" ? "al vol" : line.fill === null ? `niet binnen ${years} jaar` : `vol rond ${formatMonthNl(line.fill)}`);

export function Step7(props: {
  mode: Mode;
  today: ISODate;
  incomes: Income[];
  lines: BudgetLine[];
  plan: PlanSettings;
  goals: Goal[]; // the goals that exist, without the emergency fund
  startBalanceCents: Cents | null;
  emergencyTargetCents: Cents | null;
  stageAdded: boolean;
}) {
  const { mode, today, incomes, lines, plan, goals, stageAdded } = props;
  const pots = useRows<Pot>(
    goals.map((g) => ({
      key: g.id,
      id: g.id,
      preset: PRESETS.find((p) => p.name === g.name)?.id,
      kind: g.kind as Kind,
      name: g.name,
      amount: toEuroInput(g.targetCents),
      estimate: g.targetIsEstimate,
      deadline: g.deadline ? `${g.deadline.year}-${String(g.deadline.month).padStart(2, "0")}` : "",
      weight: g.weight,
      isMain: g.isMain,
    })),
  );
  const [share, setShare] = useState(plan.emergencySharePct === 50 ? "50" : "100");
  const [stage, setStage] = useState(stageAdded);
  const [stageSaved, setStageSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, Errors>>({});
  const previewTitle = useId();

  const anyDeadline = pots.rows.some((r) => r.deadline.trim());
  const sharePct = anyDeadline && share === "50" ? 50 : 100;

  async function save() {
    const ids: Record<string, string> = {};
    const saved = await saveRows(
      pots.rows,
      (row) => saveGoalAction({ id: row.id, kind: row.kind, name: row.name, target: row.amount, targetIsEstimate: row.estimate, deadline: row.deadline.trim() || null, weight: row.weight }),
      (key, id) => {
        ids[key] = id;
        pots.patch(key, { id });
      },
    );
    setErrors(saved.errors);
    let message = saved.message ?? (await deleteRows(pots.removed, archiveGoalAction, pots.forget));
    // The first goal the user adds becomes the main goal; when the main goal is removed, the first one left takes over.
    const first = pots.rows[0];
    if (!message && first && !pots.rows.some((r) => r.isMain)) {
      const r = await setMainGoalAction(ids[first.key] ?? first.id!);
      if (r.ok) pots.patch(first.key, { isMain: true });
      else message = r.error;
    }
    if (!message) {
      const r = await savePlanAction({ emergencySharePct: sharePct });
      if (!r.ok) message = r.error;
    }
    if (!message && stage && !stageAdded && !stageSaved) {
      const r = await addChecklistItemAction(STAGE);
      if (r.ok) setStageSaved(true);
      else message = r.error;
    }
    return message;
  }

  // Preview: the emergency fund does not exist yet, so it joins as a provisional goal with the answers of step 6.
  const budget = monthlyBudget(incomes, lines, plan.incomeMode);
  const savings = savingsTarget(plan, budget, lines.length > 0).cents;
  const fundTarget = props.emergencyTargetCents ?? suggestedEmergencyTarget(budget.expensesCents);
  const shown = pots.rows.flatMap((r) => {
    const cents = parseEuroInput(r.amount);
    return cents ? [{ id: r.key, name: r.name || "Iets anders", targetCents: cents, deadline: toYearMonth(r.deadline) }] : [];
  });
  const preview =
    shown.length > 0 && savings > 0
      ? previewTimeline({
          fund: { targetCents: fundTarget, balanceCents: Math.min(props.startBalanceCents ?? 0, fundTarget) },
          goals: shown,
          savingsCents: savings,
          sharePct,
          startMonth: currentPeriod(primaryPaydayRule(incomes), today).month,
        })
      : null;

  return (
    <StepShell mode={mode} step={7} title="Waarvoor spaar je?" intro="Kies wat je wil sparen. Het bedrag is een schatting tot je het zelf aanpast." save={save}>
      <Toggles
        legend="Veelgekozen doelen"
        items={PRESETS.map((p) => ({ id: p.id, label: p.name, hint: formatEUR(p.cents) }))}
        on={(id) => pots.rows.some((r) => r.preset === id)}
        onToggle={(id) => {
          const row = pots.rows.find((r) => r.preset === id);
          const p = PRESETS.find((x) => x.id === id)!;
          if (row) pots.remove(row.key);
          else pots.add({ preset: id, kind: p.kind, name: p.name, amount: toEuroInput(p.cents), estimate: true, deadline: "", weight: 1, isMain: false });
        }}
      />
      <Toggles legend="Iets om te regelen" items={[{ id: "stage", label: STAGE, hint: stageAdded ? "staat op je checklist" : undefined }]} on={() => stage} onToggle={() => setStage((on) => (stageAdded ? true : !on))} />
      {pots.rows.map((row) => (
        <Item key={row.key} title={row.name || "Iets anders"} onRemove={() => pots.remove(row.key)}>
          <TextField label="Naam" value={row.name} onChange={(name) => pots.patch(row.key, { name })} error={errors[row.key]?.name} maxLength={80} />
          <MoneyField
            label="Doelbedrag"
            hint={row.estimate ? "Dit is een schatting. Pas het aan als je de echte prijs weet." : undefined}
            value={row.amount}
            onChange={(amount) => pots.patch(row.key, { amount, estimate: false })}
            error={errors[row.key]?.target}
          />
          <TextField
            label="Klaar tegen (optioneel)"
            hint="Kies een maand en een jaar als je een deadline hebt."
            type="month"
            min={today.slice(0, 7)}
            placeholder="jjjj-mm"
            value={row.deadline}
            onChange={(deadline) => pots.patch(row.key, { deadline })}
            error={errors[row.key]?.deadline}
          />
        </Item>
      ))}
      <Button type="button" variant="outline" onClick={() => pots.add({ kind: "other", name: "", amount: "", estimate: false, deadline: "", weight: 1, isMain: false })}>
        Iets anders toevoegen
      </Button>
      {anyDeadline && (
        <div className="flex flex-col gap-2">
          <Choice
            legend="Noodfonds eerst helemaal vullen, of tegelijk met je doelen?"
            options={[{ value: "100", label: "Eerst noodfonds" }, { value: "50", label: "Tegelijk" }]}
            value={share}
            onChange={setShare}
          />
          <p className="text-sm text-ink-2">Bij tegelijk gaat de helft van wat je spaart naar je noodfonds en de rest naar je doelen.</p>
        </div>
      )}
      {preview && (
        <section className="flex flex-col gap-3 border-t border-hairline pt-4" aria-labelledby={previewTitle}>
          <h2 id={previewTitle} className="font-display text-lg font-semibold">
            Zo ziet je planning eruit
          </h2>
          <p className="text-sm text-ink-2">Als je ongeveer {formatEUR(savings)} per maand spaart:</p>
          <ul className="flex flex-col gap-2">
            {preview.lines.map((line, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{line.name}</span>
                <span className="text-right text-sm">{fillText(line, preview.horizonYears)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {shown.length > 0 && savings <= 0 && <p className="text-sm text-ink-2">Je spaart nu niets per maand. Vul je inkomen in om te zien wanneer je klaar bent.</p>}
    </StepShell>
  );
}
