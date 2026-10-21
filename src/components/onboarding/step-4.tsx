"use client";

import { useState } from "react";
import { Item, MoneyField, TextField, Toggles } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { deleteBudgetLineAction, saveBudgetLineAction } from "@/data/actions/budget";
import { toEuroInput } from "@/domain/money";
import type { BudgetLine } from "@/domain/types";
import { deleteRows, saveRows, useRows, type Errors, type Row } from "./rows";
import { StepShell, type Mode } from "./step-shell";

type Cost = Row & { name: string; category: string; amount: string; isEstimate: boolean; custom: boolean };

const PRESETS = ["Huur", "Gsm", "Verzekering", "Abonnementen", "Bijdrage thuis", "Lening"];

export function Step4({ mode, lines }: { mode: Mode; lines: BudgetLine[] }) {
  const rows = useRows<Cost>(
    lines
      .filter((l) => l.kind === "fixed")
      .map((l) => ({ key: l.id, id: l.id, name: l.name, category: l.category, amount: toEuroInput(l.amountCents), isEstimate: l.isEstimate, custom: !PRESETS.includes(l.name) })),
  );
  const [errors, setErrors] = useState<Record<string, Errors>>({});

  async function save() {
    const saved = await saveRows(
      rows.rows,
      (row) => saveBudgetLineAction({ id: row.id, kind: "fixed", category: row.category, name: row.name, amount: row.amount, isEstimate: row.isEstimate }),
      (key, id) => rows.patch(key, { id }),
    );
    setErrors(saved.errors);
    return saved.message ?? (await deleteRows(rows.removed, deleteBudgetLineAction, rows.forget));
  }

  const chosen = (name: string) => rows.rows.some((r) => !r.custom && r.name === name);
  const toggle = (name: string) => {
    const row = rows.rows.find((r) => !r.custom && r.name === name);
    if (row) rows.remove(row.key);
    else rows.add({ name, category: name, amount: "", isEstimate: false, custom: false });
  };

  return (
    <StepShell mode={mode} step={4} title="Wat betaal je elke maand vast?" intro="Kies wat voor jou geldt en vul het bedrag per maand in." save={save}>
      <Toggles legend="Vaste kosten" items={PRESETS.map((p) => ({ id: p, label: p }))} on={chosen} onToggle={toggle} />
      {rows.rows.map((row) => (
        <Item key={row.key} title={row.name || "Eigen kost"} onRemove={() => rows.remove(row.key)}>
          {row.custom && <TextField label="Naam" value={row.name} onChange={(name) => rows.patch(row.key, { name })} error={errors[row.key]?.name} maxLength={80} />}
          <MoneyField label="Bedrag per maand" value={row.amount} onChange={(amount) => rows.patch(row.key, { amount })} error={errors[row.key]?.amount} />
        </Item>
      ))}
      <Button type="button" variant="outline" onClick={() => rows.add({ name: "", category: "Overig", amount: "", isEstimate: false, custom: true })}>
        Eigen kost toevoegen
      </Button>
    </StepShell>
  );
}
