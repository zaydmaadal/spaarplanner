"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Choice } from "@/components/form-fields";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { savePlanAction } from "@/data/actions/plan";
import type { UserData } from "@/domain/dashboard";
import { formatEUR, toEuroInput } from "@/domain/money";
import type { Cents, ISODate } from "@/domain/types";
import { potColor } from "./labels";
import { shift, SimRow } from "./sim-row";
import { simulate } from "./simulate";

// Spec 5.5. Ranges in cents: savings 0 to max(2.000, twice the current amount) in steps of 25; the extras 0 to 1.000 in steps of 50.
const SAVINGS_STEP = 2500;
const EXTRA_MAX = 100_000;
const EXTRA_STEP = 5000;

function SliderField({ label, cents, max, step, hint, onChange }: { label: string; cents: Cents; max: number; step: number; hint?: string; onChange: (cents: Cents) => void }) {
  const labelId = useId();
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <span id={labelId} className="text-sm font-semibold">
          {label}
        </span>
        <Money cents={cents} className="text-lg text-accent-ink" />
      </div>
      <Slider aria-labelledby={labelId} aria-valuetext={formatEUR(cents)} min={0} max={max} step={step} value={[cents]} onValueChange={([next]) => onChange(next)} />
      {hint && <p className="text-xs text-ink-2">{hint}</p>}
    </div>
  );
}

export function Simulator({ base, today, savingsCents, horizonYears }: { base: UserData; today: ISODate; savingsCents: Cents; horizonYears: number }) {
  const { plan } = base;
  const titleId = useId();
  const hintId = useId();
  const [savings, setSavings] = useState<Cents | null>(null); // null: not moved, so the plan decides
  const [extraIncome, setExtraIncome] = useState(0);
  const [extraExpenses, setExtraExpenses] = useState(0);
  const [mode, setMode] = useState(plan.incomeMode);
  const [pending, startTransition] = useTransition();

  const result = useMemo(
    () =>
      simulate(base, today, {
        savingsCents: savings,
        extraIncomeCents: extraIncome,
        extraExpensesCents: extraExpenses,
        incomeMode: mode,
      }),
    [base, today, savings, extraIncome, extraExpenses, mode],
  );
  const goals = base.goals.filter((g) => !g.archived);
  // The same projection with untouched sliders: what the plan says now, to say how far the sliders move each pot.
  const start = useMemo(
    () =>
      simulate(base, today, {
        savingsCents: null,
        extraIncomeCents: 0,
        extraExpensesCents: 0,
        incomeMode: plan.incomeMode,
      }),
    [base, today, plan.incomeMode],
  );
  const hasVariableIncome = base.incomes.some((i) => i.active && i.variability === "variable");
  // Only what the user picked is stored; the extras are a trial and a proposal is never stored (spec 5.5).
  const canApply = (savings !== null && savings !== plan.monthlySavingsCents) || mode !== plan.incomeMode;
  const touched = savings !== null || extraIncome > 0 || extraExpenses > 0 || mode !== plan.incomeMode;

  const savingsHint =
    savings !== null
      ? "Je kiest zelf een bedrag. Extra inkomen en uitgaven veranderen dit niet."
      : plan.monthlySavingsCents !== null
        ? "Het bedrag uit je plan."
        : base.lines.length === 0
          ? "Voorstel: 20 % van je inkomen."
          : "Volgt je spaarruimte.";

  function apply() {
    startTransition(async () => {
      // A dropped connection throws, and a throw in a transition would show the error card of the whole screen.
      const saved = await savePlanAction({
        ...(savings !== null && { monthlySavings: toEuroInput(savings) }),
        ...(mode !== plan.incomeMode && { incomeMode: mode }),
      }).catch(() => null);
      if (!saved) toast.error("Dat lukte niet. Probeer het opnieuw.");
      else if (saved.ok) toast.success("Je plan is aangepast.");
      else toast.error(saved.error);
    });
  }

  function reset() {
    setSavings(null);
    setExtraIncome(0);
    setExtraExpenses(0);
    setMode(plan.incomeMode);
  }

  return (
    <section aria-labelledby={titleId} className="grid gap-x-8 gap-y-3 rounded-card bg-surface p-4 shadow-card lg:grid-cols-2 lg:p-6">
      <div className="flex flex-col gap-1 lg:col-span-2">
        <h2 id={titleId} className="font-display text-xl font-semibold">
          Wat als?
        </h2>
        <p className="text-sm text-ink-2">Schuif en zie wanneer je potten vol zijn. Extra inkomen en uitgaven zijn een proef: je echte bedragen pas je aan bij Profiel.</p>
      </div>
      <div className="flex flex-col gap-2">
        <SliderField label="Sparen per maand" cents={result.savingsCents} max={Math.max(200_000, 2 * savingsCents)} step={SAVINGS_STEP} hint={savingsHint} onChange={setSavings} />
        <SliderField label="Extra inkomen per maand" cents={extraIncome} max={EXTRA_MAX} step={EXTRA_STEP} onChange={setExtraIncome} />
        <SliderField label="Extra uitgaven per maand" cents={extraExpenses} max={EXTRA_MAX} step={EXTRA_STEP} onChange={setExtraExpenses} />
        {hasVariableIncome && (
          <div className="flex flex-col gap-1">
            <Choice
              legend="Wisselend inkomen"
              value={mode}
              onChange={setMode}
              options={[
                { value: "careful", label: "Voorzichtig" },
                { value: "normal", label: "Normaal" },
              ]}
            />
            <p className="text-sm text-ink-2">Voorzichtig rekent met het lage bedrag. Dit telt alleen als je spaarbedrag je spaarruimte volgt.</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 border-t pt-3 lg:border-t-0 lg:pt-0">
          <h3 className="text-sm font-semibold">Zo ziet je plan eruit</h3>
          <ul aria-live="polite" className="flex flex-col gap-1.5">
            {goals.map((g) => (
              <SimRow key={g.id} name={g.name} color={potColor(g)} fill={result.fills[g.id]} change={shift(start.fills[g.id], result.fills[g.id])} horizonYears={horizonYears} animate={touched} />
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={apply} disabled={!canApply || pending} aria-describedby={canApply ? undefined : hintId}>
            Zo instellen
          </Button>
          {!canApply && (
            <p id={hintId} className="text-sm text-ink-2">
              Kies zelf een bedrag bij Sparen per maand om het in te stellen.
            </p>
          )}
          {touched && (
            <Button variant="ghost" onClick={reset} disabled={pending}>
              Zet terug
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
