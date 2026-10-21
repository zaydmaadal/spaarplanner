import { useState } from "react";
import type { ActionResult } from "@/data/schemas";

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
