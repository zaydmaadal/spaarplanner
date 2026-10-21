import { describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/data/schemas";
import { deleteRows, saveRows } from "./rows";

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
