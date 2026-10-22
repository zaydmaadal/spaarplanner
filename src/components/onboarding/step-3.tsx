"use client";

import { useState } from "react";
import { Item, MoneyField, SelectField, TextField, Toggles } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { deleteIncomeAction, saveIncomeAction } from "@/data/actions/incomes";
import { toEuroInput } from "@/domain/money";
import type { Income, IncomeKind } from "@/domain/types";
import { keptIncomeFields } from "./income-input";
import { deleteRows, refuseBlank, saveRows, useRows, type Errors, type Row } from "./rows";
import { StepShell, type Mode } from "./step-shell";

type OneOff = Row & { stored?: Income; name: string; kind: IncomeKind; amount: string; month: string; custom: boolean };

// The month is a guess that the user can change; the amounts count as estimates.
const PRESETS = [
  { id: "13de maand", month: "12" },
  { id: "Vakantiegeld", month: "6" },
  { id: "Belastingteruggave", month: "8" },
];
const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"].map((label, i) => ({ value: String(i + 1), label }));

export function Step3({ mode, incomes, level }: { mode: Mode; incomes: Income[]; level?: 1 | 2 }) {
  const rows = useRows<OneOff>(
    incomes
      .filter((i) => i.frequency === "yearly")
      .map((i) => ({ key: i.id, id: i.id, stored: i, name: i.name, kind: i.kind, amount: toEuroInput(i.amountCents), month: String(i.month ?? 1), custom: !PRESETS.some((p) => p.id === i.name) })),
  );
  const [errors, setErrors] = useState<Record<string, Errors>>({});

  async function save() {
    const refused = refuseBlank(mode, rows.rows);
    const saved = await saveRows(
      refused.send,
      // New ones are estimates; a stored one keeps its flag, and everything else the form has no input for.
      (row) =>
        saveIncomeAction({ ...keptIncomeFields(row.stored, "yearly"), isEstimate: row.stored?.isEstimate ?? true, id: row.id, name: row.name, kind: row.kind, frequency: "yearly", month: Number(row.month), amount: row.amount }),
      (key, id) => rows.patch(key, { id }),
    );
    setErrors({ ...refused.errors, ...saved.errors });
    return saved.message ?? refused.message ?? (await deleteRows(rows.removed, deleteIncomeAction, rows.forget));
  }

  const chosen = (id: string) => rows.rows.some((r) => !r.custom && r.name === id);
  const toggle = (id: string) => {
    const row = rows.rows.find((r) => !r.custom && r.name === id);
    if (row) rows.remove(row.key);
    else rows.add({ name: id, kind: "other", amount: "", month: PRESETS.find((p) => p.id === id)!.month, custom: false });
  };

  return (
    <StepShell mode={mode} step={3} level={level} title="Krijg je ook eenmalig geld?" intro="Bijvoorbeeld je 13de maand, vakantiegeld of een belastingteruggave. Een schatting is goed genoeg." save={save}>
      <Toggles legend="Wat krijg je ongeveer elk jaar?" items={PRESETS.map((p) => ({ id: p.id, label: p.id }))} on={chosen} onToggle={toggle} />
      {rows.rows.map((row) => (
        <Item key={row.key} title={row.name || "Eenmalig inkomen"} onRemove={() => rows.remove(row.key)}>
          {row.custom && <TextField label="Naam" value={row.name} onChange={(name) => rows.patch(row.key, { name })} error={errors[row.key]?.name} maxLength={80} />}
          <MoneyField label="Bedrag" hint="Een schatting is goed." value={row.amount} onChange={(amount) => rows.patch(row.key, { amount })} error={errors[row.key]?.amount} />
          <SelectField label="In welke maand krijg je dit?" options={MONTHS} value={row.month} onChange={(month) => rows.patch(row.key, { month })} error={errors[row.key]?.month} />
        </Item>
      ))}
      <Button type="button" variant="outline" onClick={() => rows.add({ name: "", kind: "other", amount: "", month: "1", custom: true })}>
        Ander eenmalig inkomen toevoegen
      </Button>
    </StepShell>
  );
}
