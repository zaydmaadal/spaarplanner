"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckField, MoneyField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { saveGoalAction } from "@/data/actions/goals";
import { buildDashboard, type UserData } from "@/domain/dashboard";
import { toEuroInput } from "@/domain/money";
import type { Goal, ISODate } from "@/domain/types";
import { draftGoals, previewInputs } from "./effect";
import { EffectPreview } from "./effect-preview";
import { goalError } from "./helpers";

// Spec 8.4: a new goal, or `goal` edited, with what it does to the other goals shown before saving (spec 5.4).
// saveGoalAction replaces the whole goal, so every field is sent; the weight is not edited here and stays as it was.
export function GoalForm({ data, today, goal }: { data: UserData; today: ISODate; goal?: Goal }) {
  const router = useRouter();
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? toEuroInput(goal.targetCents) : "");
  const [estimate, setEstimate] = useState(goal?.targetIsEstimate ?? false);
  const [deadline, setDeadline] = useState(goal?.deadline ? `${goal.deadline.year}-${String(goal.deadline.month).padStart(2, "0")}` : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isFund = goal?.kind === "emergency"; // the emergency fund has no deadline (spec 5.3)

  const dashboard = useMemo(() => buildDashboard(data, today), [data, today]);
  const inputs = useMemo(() => {
    const after = draftGoals(dashboard.projectionInput.goals, { name, target, deadline: isFund ? "" : deadline }, goal ?? null);
    const oneOff = data.plan.includeOneOffIncome ? { incomes: data.incomes, periodStart: dashboard.period.start } : null;
    return after && previewInputs(dashboard.projectionInput, after, oneOff);
  }, [dashboard, data, name, target, deadline, isFund, goal]);

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      const saved = await saveGoalAction({ id: goal?.id, kind: "other", name, target, targetIsEstimate: estimate, deadline: isFund ? null : deadline || null, weight: goal?.weight ?? 1 });
      setErrors(saved.ok ? {} : (saved.fieldErrors ?? {}));
      if (!saved.ok) return setError(goalError(saved.error));
      toast.success("Doel opgeslagen.");
      // Next keeps this page mounted, hidden, after leaving it: a new goal starts from an empty form next time.
      if (!goal) {
        setName("");
        setTarget("");
        setEstimate(false);
        setDeadline("");
      }
      router.push(goal ? `/doelen/${goal.id}` : "/doelen");
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-card bg-surface p-5">
        <TextField label="Naam" value={name} onChange={setName} error={errors.name} maxLength={80} autoComplete="off" />
        <MoneyField label="Doelbedrag" value={target} onChange={setTarget} error={errors.target} />
        <CheckField label="Dit bedrag is een schatting" hint="Je kan het later aanpassen als je de echte prijs weet." checked={estimate} onChange={setEstimate} />
        {!isFund && (
          <TextField
            label="Klaar tegen (optioneel)"
            hint="Kies een maand en een jaar als je een deadline hebt."
            type="month"
            placeholder="jjjj-mm"
            value={deadline}
            onChange={setDeadline}
            error={errors.deadline}
          />
        )}
        {inputs ? <EffectPreview before={inputs.before} after={inputs.after} /> : <p className="text-ink-2">Vul een naam en een bedrag in om te zien wat dit voor je andere potten betekent.</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          Doel opslaan
        </Button>
        <Link href={goal ? `/doelen/${goal.id}` : "/doelen"} className="inline-flex h-11 items-center justify-center rounded-md px-2 text-sm font-semibold underline underline-offset-4">
          Annuleren
        </Link>
      </div>
    </form>
  );
}
