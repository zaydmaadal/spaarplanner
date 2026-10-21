import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import { dbFailure, done } from "./shared";

const SOMETHING_WRONG = "Er ging iets mis. Probeer het opnieuw.";

beforeEach(() => vi.resetAllMocks());

describe("dbFailure", () => {
  it("says the maximum is reached for the row cap trigger of any table (check_violation)", () => {
    for (const table of ["goals", "income_sources", "budget_lines", "checklist_items", "transactions"]) {
      expect(dbFailure({ code: "23514", message: `row limit reached for ${table}` })).toEqual({
        ok: false,
        error: "Je hebt het maximum bereikt. Verwijder eerst iets.",
      });
    }
  });

  it("does not mistake another check constraint, another code or another message for the cap", () => {
    expect(dbFailure({ code: "23514", message: 'new row for relation "goals" violates check constraint "goals_name_check"' }).error).toBe(SOMETHING_WRONG);
    expect(dbFailure({ code: "23505", message: "row limit reached for goals" }).error).toBe(SOMETHING_WRONG);
    expect(dbFailure({}).error).toBe(SOMETHING_WRONG);
  });
});

describe("done", () => {
  it("refreshes the whole layout and returns the data", () => {
    expect(done({ id: "x" })).toEqual({ ok: true, data: { id: "x" } });
    expect(m.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
