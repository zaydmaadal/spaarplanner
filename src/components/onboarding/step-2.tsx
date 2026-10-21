"use client";

import { useState } from "react";
import { CheckField, Choice, Item, MoneyField, SelectField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { deleteIncomeAction, saveIncomeAction } from "@/data/actions/incomes";
import { saveProfileAction } from "@/data/actions/profile";
import { toEuroInput } from "@/domain/money";
import type { Income, IncomeKind } from "@/domain/types";
import { keptIncomeFields } from "./income-input";
import { BLANK_AMOUNT, blankAmount, deleteRows, refuseBlank, saveRows, useRows, type Errors, type Row } from "./rows";
import { StepShell, type Mode } from "./step-shell";

type Frequency = "monthly" | "weekly" | "biweekly";
type Payday = "day" | "last" | "irregular";
type Main = { id?: string; stored?: Income; removing?: boolean; name: string; amount: string; frequency: Frequency; variable: boolean; low: string; payday: Payday; day: string; weekend: "before" | "after"; weekday: string };
type Extra = Row & { stored?: Income; name: string; kind: IncomeKind; amount: string; frequency: Frequency };

const FREQUENCIES = [
  { value: "monthly", label: "Per maand" },
  { value: "weekly", label: "Per week" },
  { value: "biweekly", label: "Per twee weken" },
] as const;
const KINDS = [
  { value: "side", label: "Bijberoep of flexi-job" },
  { value: "student", label: "Studentenjob" },
  { value: "allowance", label: "Zakgeld" },
  { value: "benefit", label: "Uitkering" },
  { value: "other", label: "Iets anders" },
];
// "Loon" is the main income above: an extra income cannot become salary, or after a reload they could swap roles.
// A row that already is salary (made elsewhere) keeps showing it.
const SALARY = { value: "salary", label: "Loon" };
const WEEKDAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"].map((label, i) => ({ value: String(i + 1), label }));
const isRegular = (i: Income): i is Income & { frequency: Frequency } => i.frequency === "monthly" || i.frequency === "weekly" || i.frequency === "biweekly";

function toMain(i?: Income & { frequency: Frequency }): Main {
  const rule = i?.paydayRule;
  return {
    id: i?.id,
    stored: i,
    name: i?.name ?? "Netto inkomen",
    amount: i ? toEuroInput(i.amountCents) : "",
    frequency: i?.frequency ?? "monthly",
    variable: i?.variability === "variable",
    low: i?.amountLowCents != null ? toEuroInput(i.amountLowCents) : "",
    payday: rule?.type === "last_working_day" ? "last" : rule?.type === "irregular" ? "irregular" : "day",
    day: rule?.type === "day_of_month" ? String(rule.day) : "",
    weekend: rule?.type === "day_of_month" ? rule.weekend : "before",
    weekday: rule?.type === "weekday" ? String(rule.weekday) : "5",
  };
}

function paydayRule(m: Main) {
  if (m.frequency !== "monthly") return { type: "weekday" as const, weekday: Number.parseInt(m.weekday, 10) };
  if (m.payday === "last") return { type: "last_working_day" as const };
  if (m.payday === "day") return { type: "day_of_month" as const, day: Number.parseInt(m.day, 10) || 0, weekend: m.weekend };
  return { type: "irregular" as const };
}

export function Step2({ mode, incomes, firstJob }: { mode: Mode; incomes: Income[]; firstJob: boolean }) {
  const regular = incomes.filter(isRegular);
  const first = regular.find((i) => i.kind === "salary");
  const [main, setMain] = useState(toMain(first));
  const [job, setJob] = useState(firstJob);
  const extras = useRows<Extra>(
    regular.filter((i) => i !== first).map((i) => ({ key: i.id, id: i.id, stored: i, name: i.name, kind: i.kind, amount: toEuroInput(i.amountCents), frequency: i.frequency })),
  );
  const [mainErrors, setMainErrors] = useState<Errors>({});
  const [errors, setErrors] = useState<Record<string, Errors>>({});
  const change = (patch: Partial<Main>) => setMain((m) => ({ ...m, ...patch }));

  async function save() {
    let message: string | null = null;
    if (job !== firstJob) {
      const r = await saveProfileAction({ prefs: { firstJob: job } });
      if (!r.ok) message = r.error;
    }
    // A blank amount: while onboarding it means "nothing to say here" and a stored main income is removed; on a Meer page it
    // is an error, and the income is only removed after "Verwijderen".
    // saveIncomeAction replaces the whole income, so what this form has no input for goes back as stored.
    const ifBlank = blankAmount(mode, main);
    if (main.amount.trim()) {
      const r = await saveIncomeAction({
        id: main.id,
        isEstimate: main.stored?.isEstimate,
        active: main.stored?.active,
        name: main.name,
        kind: "salary",
        frequency: main.frequency,
        amount: main.amount,
        variability: main.variable ? "variable" : "fixed",
        amountLow: main.variable && main.low.trim() ? main.low : null,
        paydayRule: paydayRule(main),
      });
      setMainErrors(r.ok ? {} : (r.fieldErrors ?? {}));
      if (r.ok) change({ id: r.data.id });
      else message ??= r.error;
    } else if (ifBlank === "delete") {
      const r = await deleteIncomeAction(main.id!);
      setMainErrors({});
      if (r.ok) change({ id: undefined, stored: undefined, removing: false });
      else message ??= r.error;
    } else {
      setMainErrors(ifBlank === "error" ? { amount: BLANK_AMOUNT } : {});
      if (ifBlank === "error") message ??= "Controleer je gegevens.";
    }
    const refused = refuseBlank(mode, extras.rows);
    const saved = await saveRows(
      refused.send,
      (row) => saveIncomeAction({ ...keptIncomeFields(row.stored, row.frequency), id: row.id, name: row.name, kind: row.kind, frequency: row.frequency, amount: row.amount }),
      (key, id) => extras.patch(key, { id }),
    );
    setErrors({ ...refused.errors, ...saved.errors });
    message ??= saved.message ?? refused.message ?? (await deleteRows(extras.removed, deleteIncomeAction, extras.forget));
    return message;
  }

  return (
    <StepShell
      mode={mode}
      step={2}
      title="Wat verdien je?"
      intro={mode === "edit" ? undefined : "Vul in wat je netto krijgt, dus na belastingen. Een schatting is goed genoeg."}
      save={save}
    >
      <MoneyField
        label="Netto bedrag"
        hint={main.removing ? "Wordt verwijderd als je opslaat." : "Wat je echt krijgt op je rekening."}
        value={main.amount}
        onChange={(amount) => change({ amount, removing: false })}
        onRemove={mode === "edit" && main.id ? () => change({ amount: "", removing: true }) : undefined}
        error={mainErrors.amount}
      />
      <Choice legend="Hoe vaak krijg je dit?" options={[...FREQUENCIES]} value={main.frequency} onChange={(frequency) => change({ frequency })} error={mainErrors.frequency} />
      <Choice legend="Is het bedrag elke keer hetzelfde?" options={[{ value: "fixed", label: "Vast bedrag" }, { value: "variable", label: "Wisselend" }]} value={main.variable ? "variable" : "fixed"} onChange={(v) => change({ variable: v === "variable" })} />
      {main.variable && <MoneyField label="Laagste bedrag dat je verwacht" hint="We rekenen voorzichtig met dit bedrag." value={main.low} onChange={(low) => change({ low })} error={mainErrors.amountLow} />}
      {main.frequency === "monthly" ? (
        <>
          <Choice
            legend="Wanneer krijg je het?"
            options={[{ value: "day", label: "Vaste dag van de maand" }, { value: "last", label: "Laatste werkdag" }, { value: "irregular", label: "Dat wisselt" }]}
            value={main.payday}
            onChange={(payday) => change({ payday })}
            error={mainErrors.type}
          />
          {main.payday === "day" && (
            <>
              <TextField label="Dag van de maand" hint="Een getal van 1 tot en met 31." inputMode="numeric" autoComplete="off" value={main.day} onChange={(day) => change({ day })} error={mainErrors.day} />
              <Choice legend="Valt die dag in het weekend?" options={[{ value: "before", label: "Betaal op de werkdag ervoor" }, { value: "after", label: "Betaal op de werkdag erna" }]} value={main.weekend} onChange={(weekend) => change({ weekend })} error={mainErrors.weekend} />
            </>
          )}
        </>
      ) : (
        <SelectField label="Op welke dag krijg je het?" options={WEEKDAYS} value={main.weekday} onChange={(weekday) => change({ weekday })} error={mainErrors.weekday} />
      )}
      <CheckField label="Dit is mijn eerste job" checked={job} onChange={setJob} />

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Extra inkomen</h2>
        <p className="text-sm text-ink-2">Bijberoep, flexi-job, studentenjob of zakgeld.</p>
        {extras.rows.map((row) => (
          <Item key={row.key} title={row.name || "Extra inkomen"} onRemove={() => extras.remove(row.key)}>
            <TextField label="Naam" value={row.name} onChange={(name) => extras.patch(row.key, { name })} error={errors[row.key]?.name} maxLength={80} />
            <SelectField label="Soort" options={row.kind === "salary" ? [...KINDS, SALARY] : KINDS} value={row.kind} onChange={(kind) => extras.patch(row.key, { kind: kind as IncomeKind })} />
            <MoneyField label="Netto bedrag" value={row.amount} onChange={(amount) => extras.patch(row.key, { amount })} error={errors[row.key]?.amount} />
            <Choice legend="Hoe vaak?" options={[...FREQUENCIES]} value={row.frequency} onChange={(frequency) => extras.patch(row.key, { frequency })} />
          </Item>
        ))}
        <Button type="button" variant="outline" onClick={() => extras.add({ name: "", kind: "side", amount: "", frequency: "monthly" })}>
          Extra inkomen toevoegen
        </Button>
      </div>
    </StepShell>
  );
}
