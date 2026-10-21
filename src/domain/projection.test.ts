import { describe, expect, test } from "vitest";
import { compareProjections, extraNeededCents, fillMonth, goalStatus, horizonFor, periodZeroAvailable, project } from "./projection";
import { emergency, goal } from "./test-helpers";

const nov = { year: 2026, month: 11 };
const base = { savingsCents: 50000, emergencySharePct: 100, startMonth: nov, depositedThisPeriodCents: 0, oneOffs: [] };

describe("project (spec 5.4)", () => {
  test("spec 5.9 rows 1 to 6", () => {
    expect(project({ ...base, goals: [emergency(150000), goal("reis", 100000)] }).fill).toEqual({ nood: 2, reis: 4 });
    expect(project({ ...base, emergencySharePct: 50, goals: [emergency(150000), goal("reis", 100000)] }).fill).toEqual({ nood: 4, reis: 3 });
    expect(project({ ...base, savingsCents: 0, goals: [emergency(150000), goal("reis", 100000)] }).fill).toEqual({ nood: null, reis: null });
    expect(
      project({ ...base, savingsCents: 30000, goals: [emergency(10000, 10000), goal("a", 100000, { weight: 2 }), goal("b", 100000, { priority: 2 })] }).fill,
    ).toEqual({ nood: "full", a: 4, b: 6 });
  });

  test("deposits this period are not counted twice", () => {
    expect(project({ ...base, depositedThisPeriodCents: 20000, goals: [emergency(150000, 20000), goal("reis", 100000)] }).fill).toEqual({ nood: 2, reis: 4 });
  });

  test("one-off income in december", () => {
    const oneOffs = [{ month: { year: 2026, month: 12 }, cents: 100000 }];
    expect(project({ ...base, oneOffs, goals: [emergency(150000), goal("reis", 100000)] }).fill).toEqual({ nood: 1, reis: 2 });
  });

  test("archived goals are left out", () => {
    expect(project({ ...base, goals: [emergency(150000), goal("oud", 1, { archived: true })] }).fill).toEqual({ nood: 2 });
  });

  test("deposits above the savings: the one-off in period 0 is added to the target before they come off", () => {
    expect(periodZeroAvailable(50000, 30000, 70000)).toBe(10000);
    expect(periodZeroAvailable(50000, 0, 70000)).toBe(0);
    expect(periodZeroAvailable(50000, 30000, 0)).toBe(80000);
    const oneOffs = [{ month: nov, cents: 30000 }];
    // 700 booked of a 500 target and a 300 one-off: period 0 gets 100 (balance 800), period 1 gets 500 (full)
    expect(project({ ...base, depositedThisPeriodCents: 70000, oneOffs, goals: [goal("reis", 100000, { balance: 70000 })] }).fill).toEqual({ reis: 1 });
  });
});

describe("horizonFor", () => {
  test("at least 120, at most 480, otherwise up to the latest deadline", () => {
    expect(horizonFor([], nov)).toBe(120);
    expect(horizonFor([goal("hijra", 1, { deadline: { year: 2056, month: 11 } })], nov)).toBe(361);
    expect(horizonFor([goal("x", 1, { deadline: { year: 2070, month: 1 } })], nov)).toBe(480);
  });
});

describe("fillMonth", () => {
  test("maps a period index to a month", () => {
    expect(fillMonth(2, nov)).toEqual({ year: 2027, month: 1 });
    expect(fillMonth("full", nov)).toBe("full");
    expect(fillMonth(null, nov)).toBeNull();
  });
});

describe("goalStatus and extraNeededCents", () => {
  const ex3 = { ...base, goals: [emergency(150000, 150000), goal("laptop", 120000, { deadline: { year: 2027, month: 1 } }), goal("reis", 100000, { priority: 2 })] };
  const ex4 = { ...base, goals: [emergency(150000, 150000), goal("laptop", 120000, { deadline: nov })] };

  test("op schema, and no status without a deadline", () => {
    expect(project(ex3).fill).toEqual({ nood: "full", laptop: 2, reis: 4 });
    expect(goalStatus(ex3, "laptop")).toBe("op_schema");
    expect(goalStatus(ex3, "reis")).toBeNull();
  });

  test("krap: fills in the deadline month, misses with 10 % less", () => {
    const krap = { ...base, savingsCents: 40000, goals: [emergency(150000, 150000), goal("laptop", 120000, { deadline: { year: 2027, month: 1 } })] };
    expect(goalStatus(krap, "laptop")).toBe("krap");
  });

  test("niet haalbaar, and the extra euros that fix it", () => {
    expect(project(ex4).fill.laptop).toBe(2);
    expect(goalStatus(ex4, "laptop")).toBe("niet_haalbaar");
    expect(extraNeededCents(ex4, "laptop")).toBe(70000);
    expect(extraNeededCents(ex3, "laptop")).toBe(0);
  });

  test("extra needed is capped at 100.000 euro", () => {
    const hopeless = { ...base, goals: [emergency(150000, 150000), goal("villa", 99_000_000, { deadline: nov })] };
    expect(extraNeededCents(hopeless, "villa")).toBe(10_000_000);
  });
});

describe("compareProjections", () => {
  test("adding a laptop pushes the trip from mrt to mei 2027", () => {
    const before = project({ ...base, goals: [emergency(150000), goal("reis", 100000)] });
    const after = project({ ...base, goals: [emergency(150000), goal("reis", 100000), goal("laptop", 120000, { priority: 2 })] });
    expect(after.fill).toEqual({ nood: 2, reis: 6, laptop: 7 });
    expect(compareProjections(before, after, nov)).toEqual([
      { goalId: "reis", from: { year: 2027, month: 3 }, to: { year: 2027, month: 5 }, deltaMonths: 2 },
      { goalId: "laptop", from: null, to: { year: 2027, month: 6 }, deltaMonths: null },
    ]);
  });

  test("on equal horizons a far-deadline goal does not shift an unrelated goal", () => {
    const input = { ...base, savingsCents: 10000 };
    const beforeGoals = [emergency(150000, 150000), goal("reis", 1_395_000)];
    const afterGoals = [...beforeGoals, goal("villa", 361, { priority: 2, deadline: { year: 2056, month: 11 } })];
    const horizon = Math.max(horizonFor(beforeGoals, nov), horizonFor(afterGoals, nov));
    const before = project({ ...input, goals: beforeGoals, horizon });
    const after = project({ ...input, goals: afterGoals, horizon });
    expect(before.fill.reis).toBe(139);
    expect(compareProjections(before, after, nov).map((s) => s.goalId)).toEqual(["villa"]);
  });
});
