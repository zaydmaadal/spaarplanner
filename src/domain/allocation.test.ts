import { describe, expect, test } from "vitest";
import { allocate } from "./allocation";
import { emergency, goal } from "./test-helpers";

const nov = { year: 2026, month: 11 };
const dec = { year: 2026, month: 12 };

describe("allocate (spec 5.3)", () => {
  test("first-period cases of spec 5.9, rows 1 to 6", () => {
    expect(allocate(50000, [emergency(150000), goal("reis", 100000)], 100, nov)).toEqual({ nood: 50000, reis: 0 });
    expect(allocate(50000, [emergency(150000), goal("reis", 100000)], 50, nov)).toEqual({ nood: 25000, reis: 25000 });
    expect(
      allocate(
        50000,
        [emergency(150000, 150000), goal("laptop", 120000, { deadline: { year: 2027, month: 1 } }), goal("reis", 100000, { priority: 2 })],
        100,
        nov,
      ),
    ).toEqual({ nood: 0, laptop: 40000, reis: 10000 });
    expect(allocate(50000, [emergency(150000, 150000), goal("laptop", 120000, { deadline: nov })], 100, nov)).toEqual({ nood: 0, laptop: 50000 });
    expect(allocate(0, [emergency(150000), goal("reis", 100000)], 100, nov)).toEqual({ nood: 0, reis: 0 });
    expect(
      allocate(30000, [emergency(10000, 10000), goal("a", 100000, { weight: 2 }), goal("b", 100000, { priority: 2 })], 100, nov),
    ).toEqual({ nood: 0, a: 20000, b: 10000 });
  });

  test("remainder cents of step 3 go to the first goal in sort order", () => {
    expect(allocate(100, [goal("a", 1000), goal("b", 1000, { priority: 2 }), goal("c", 1000, { priority: 3 })], 100, nov)).toEqual({ a: 34, b: 33, c: 33 });
  });

  test("step 4 gives the rest to a deadline goal ahead of schedule", () => {
    expect(allocate(50000, [emergency(150000, 150000), goal("laptop", 120000, { deadline: { year: 2027, month: 12 } })], 100, nov)).toEqual({ nood: 0, laptop: 50000 });
  });

  test("step 5 sends the rest to a full emergency fund as buffer", () => {
    expect(allocate(50000, [emergency(150000, 150000), goal("reis", 100000, { balance: 100000 })], 100, nov)).toEqual({ nood: 50000, reis: 0 });
  });

  test("archived goals are omitted", () => {
    expect(allocate(50000, [emergency(0), goal("oud", 1000, { archived: true })], 100, nov)).toEqual({ nood: 50000 });
  });

  test("step 3 caps a goal at what it needs and re-splits the rest", () => {
    expect(allocate(30000, [emergency(0), goal("a", 5000), goal("b", 100000), goal("c", 100000)], 100, nov)).toEqual({ nood: 0, a: 5000, b: 12500, c: 12500 });
  });

  test("a past deadline asks the full remainder now", () => {
    expect(allocate(50000, [emergency(0), goal("late", 20000, { deadline: { year: 2026, month: 9 } })], 100, nov)).toEqual({ nood: 30000, late: 20000 });
  });

  test("deadline goals sort on deadline, then priority, then createdAt, then id", () => {
    const run = (...goals: ReturnType<typeof goal>[]) => allocate(10000, [emergency(0), ...goals], 100, nov);
    expect(run(goal("x", 100000, { deadline: dec, priority: 1 }), goal("y", 100000, { deadline: nov, priority: 5 }))).toMatchObject({ x: 0, y: 10000 });
    expect(run(goal("x", 100000, { deadline: nov, priority: 2 }), goal("y", 100000, { deadline: nov, priority: 1 }))).toMatchObject({ x: 0, y: 10000 });
    expect(run(goal("x", 100000, { deadline: nov, createdAt: "2026-02-01" }), goal("y", 100000, { deadline: nov, createdAt: "2026-01-01" }))).toMatchObject({ x: 0, y: 10000 });
    expect(run(goal("y", 100000, { deadline: nov }), goal("x", 100000, { deadline: nov }))).toMatchObject({ x: 10000, y: 0 });
  });
});
