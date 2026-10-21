import { useState } from "react";
import type { ActionResult } from "@/data/schemas";
import type { Mode } from "./step-shell";

export type Errors = Record<string, string>;
export type Row = { key: string; id?: string }; // id: the row is stored; key: what React and the errors go by

let counter = 0;

// The rows of one form. A row removed here that is stored too is remembered in `removed`, to delete it on save.
export function useRows<R extends Row>(initial: R[]) {
  const [rows, setRows] = useState(initial);
  const [removed, setRemoved] = useState<string[]>([]);
  return {
    rows,
    removed,
    add: (row: Omit<R, "key">) => setRows((all) => [...all, { ...row, key: `new-${++counter}` } as R]),
    patch: (key: string, change: Partial<R>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r))),
    remove: (key: string) => {
      const id = rows.find((r) => r.key === key)?.id;
      if (id) setRemoved((ids) => [...ids, id]);
      setRows((all) => all.filter((r) => r.key !== key));
    },
    forget: (id: string) => setRemoved((ids) => ids.filter((x) => x !== id)),
  };
}

// Saves the rows one by one. A row that went through reports its id, so a retry updates it instead of inserting it twice.
export async function saveRows<R extends Row>(
  rows: R[],
  save: (row: R) => Promise<ActionResult<{ id: string }>>,
  onSaved: (key: string, id: string) => void,
): Promise<{ errors: Record<string, Errors>; message: string | null }> {
  const errors: Record<string, Errors> = {};
  let message: string | null = null;
  for (const row of rows) {
    const result = await save(row);
    if (result.ok) onSaved(row.key, result.data.id);
    else {
      errors[row.key] = result.fieldErrors ?? {};
      message ??= result.error;
    }
  }
  return { errors, message };
}

export async function deleteRows(ids: string[], remove: (id: string) => Promise<ActionResult>, onDeleted: (id: string) => void): Promise<string | null> {
  let message: string | null = null;
  for (const id of ids) {
    const result = await remove(id);
    if (result.ok) onDeleted(id);
    else message ??= result.error;
  }
  return message;
}

export const BLANK_AMOUNT = "Vul een bedrag in of verwijder deze regel."; // under the field
const CHECK_DATA = "Controleer je gegevens."; // under the form, like the action says for a field it refuses

// What a blank amount means for a row. While onboarding it means "nothing to say here", so a stored row is removed. On a
// Meer page (mode edit) a stored row without an amount is a mistake to correct, never a delete: deleting is the
// "Verwijderen" button, which sets `removing`.
export function blankAmount(mode: Mode, row: { id?: string; removing?: boolean }): "skip" | "delete" | "error" {
  if (!row.id) return "skip";
  return mode === "onboarding" || row.removing ? "delete" : "error";
}

// For the list forms, whose rows go to the action as they are: on a Meer page the stored rows without an amount are held
// back with an error on their field. A new blank row still goes to the action, which says what is wrong with it.
export function refuseBlank<R extends Row & { amount: string }>(mode: Mode, rows: R[]): { send: R[]; errors: Record<string, Errors>; message: string | null } {
  const refused = rows.filter((r) => !r.amount.trim() && blankAmount(mode, r) === "error");
  return {
    send: rows.filter((r) => !refused.includes(r)),
    errors: Object.fromEntries(refused.map((r) => [r.key, { amount: BLANK_AMOUNT }])),
    message: refused.length > 0 ? CHECK_DATA : null,
  };
}
