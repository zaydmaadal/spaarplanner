import { describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/data/schemas";
import { BLANK_AMOUNT, blankAmount, deleteRows, refuseBlank, saveRows } from "./rows";

const ok = (id: string): ActionResult<{ id: string }> => ({ ok: true, data: { id } });
const rows = [{ key: "a" }, { key: "b" }, { key: "c" }];

describe("saveRows", () => {
  it("hands back the id of every row that went through, even when another row fails", async () => {
    const saved: Record<string, string> = {};
    const save = vi.fn(async (row: { key: string }) =>
      row.key === "b" ? ({ ok: false, error: "Controleer je gegevens.", fieldErrors: { name: "Vul een naam in." } } as const) : ok(`id-${row.key}`),
    );
    const out = await saveRows(rows, save, (key, id) => (saved[key] = id));
    expect(saved).toEqual({ a: "id-a", c: "id-c" });
    expect(out).toEqual({ errors: { b: { name: "Vul een naam in." } }, message: "Controleer je gegevens." });
    expect(save).toHaveBeenCalledTimes(3);
  });

  it("answers without errors when every row is saved", async () => {
    expect(await saveRows(rows, async (r) => ok(r.key), () => {})).toEqual({ errors: {}, message: null });
  });

  it("keeps the first message when several rows fail", async () => {
    const out = await saveRows(rows, async (r) => ({ ok: false, error: `fout ${r.key}` }), () => {});
    expect(out.message).toBe("fout a");
  });
});

describe("deleteRows", () => {
  it("reports each id that is gone, and the first failure", async () => {
    const gone: string[] = [];
    const del = async (id: string): Promise<ActionResult> => (id === "x" ? { ok: false, error: "Er ging iets mis." } : { ok: true, data: undefined });
    expect(await deleteRows(["w", "x", "y"], del, (id) => gone.push(id))).toBe("Er ging iets mis.");
    expect(gone).toEqual(["w", "y"]);
    expect(await deleteRows([], del, () => {})).toBeNull();
  });
});

describe("blankAmount (what a blank amount means for a row)", () => {
  it("skips a row that is not stored: there is nothing to say", () => {
    expect(blankAmount("onboarding", {})).toBe("skip");
    expect(blankAmount("edit", {})).toBe("skip");
  });

  it("deletes a stored row while onboarding: a blank amount means 'nothing to say here'", () => {
    expect(blankAmount("onboarding", { id: "x" })).toBe("delete");
  });

  it("is an error for a stored row on a Meer page: a mistake to correct, never a delete", () => {
    expect(blankAmount("edit", { id: "x" })).toBe("error");
    expect(blankAmount("edit", { id: "x", removing: false })).toBe("error");
  });

  it("deletes a stored row on a Meer page only after the user pressed Verwijderen", () => {
    expect(blankAmount("edit", { id: "x", removing: true })).toBe("delete");
  });
});

describe("refuseBlank", () => {
  const row = (key: string, amount: string, id?: string) => ({ key, id, amount });

  it("on a Meer page keeps the stored rows without an amount from being sent, with an error on their field", () => {
    const rows = [row("a", "10", "id-a"), row("b", "", "id-b"), row("c", "  ", "id-c"), row("d", "")];
    const out = refuseBlank("edit", rows);
    expect(out.send.map((r) => r.key)).toEqual(["a", "d"]); // a new blank row goes on: the action says what is wrong with it
    expect(out.errors).toEqual({ b: { amount: BLANK_AMOUNT }, c: { amount: BLANK_AMOUNT } });
    expect(out.message).toBe("Controleer je gegevens."); // under the form; the field says what to do
    expect(BLANK_AMOUNT).toBe("Vul een bedrag in of verwijder deze regel.");
  });

  it("changes nothing while onboarding", () => {
    const rows = [row("a", "10", "id-a"), row("b", "", "id-b")];
    expect(refuseBlank("onboarding", rows)).toEqual({ send: rows, errors: {}, message: null });
  });

  it("answers without errors when every amount is filled", () => {
    const rows = [row("a", "10", "id-a")];
    expect(refuseBlank("edit", rows)).toEqual({ send: rows, errors: {}, message: null });
  });
});
