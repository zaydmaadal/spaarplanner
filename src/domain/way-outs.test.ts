import { describe, expect, test } from "vitest";
import type { ProjectionInput } from "./projection";
import { goal } from "./test-helpers";
import { wayOuts } from "./way-outs";

const input = (over: Partial<ProjectionInput> = {}): ProjectionInput => ({
  goals: [goal("reis", 120_000, { deadline: { year: 2027, month: 3 } })],
  savingsCents: 10_000,
  emergencySharePct: 100,
  startMonth: { year: 2026, month: 10 },
  depositedThisPeriodCents: 0,
  oneOffs: [],
  ...over,
});

describe("wayOuts", () => {
  // oktober 2026 to maart 2027 is 6 periods: 6 x 100 = 600 of the 1.200 needed.
  test("gives the three ways out with exact numbers", () => {
    expect(wayOuts(input(), "reis")).toEqual([
      { kind: "save_more", extraCents: 10_000 }, // 6 x 200 = 1.200
      { kind: "move_deadline", month: { year: 2027, month: 9 } }, // 12 x 100 = 1.200, the 12th period
      { kind: "lower_target", targetCents: 60_000 }, // 6 x 100
    ]);
  });

  test("the lowered target counts what is already in the pot", () => {
    const goals = [goal("reis", 120_000, { balance: 30_000, deadline: { year: 2027, month: 3 } })];
    // 300 + 6 x 100 = 900 at the deadline
    expect(wayOuts(input({ goals }), "reis").find((w) => w.kind === "lower_target")).toEqual({ kind: "lower_target", targetCents: 90_000 });
  });

  test("a goal that is on schedule has no ways out", () => {
    expect(wayOuts(input({ savingsCents: 50_000 }), "reis")).toEqual([]);
  });

  test("a goal without a deadline has no ways out", () => {
    expect(wayOuts(input({ goals: [goal("reis", 120_000)] }), "reis")).toEqual([]);
  });

  test("a deadline in the past can only be moved: no lower target is full before it", () => {
    const goals = [goal("reis", 120_000, { deadline: { year: 2026, month: 8 } })];
    expect(wayOuts(input({ goals }), "reis")).toEqual([
      { kind: "move_deadline", month: { year: 2027, month: 9 } },
    ]);
  });
});
