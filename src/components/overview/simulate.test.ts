import { describe, expect, test } from "vitest";
import { buildDashboard } from "@/domain/dashboard";
import { haider, student } from "@/domain/fixtures/personas";
import { simulate } from "./simulate";

const today = "2026-10-20";
const neutral = { savingsCents: null, extraIncomeCents: 0, extraExpensesCents: 0, incomeMode: "normal" } as const;
const monthIndex = (ym: { year: number; month: number }) => ym.year * 12 + ym.month;

describe("simulate: savings (spec 5.5)", () => {
  test("an amount the user picked is used as it is", () => {
    expect(simulate(haider, today, { ...neutral, savingsCents: 50000 }).savingsCents).toBe(50000);
  });

  test("without a picked amount it starts from the plan: Haider's proposal is 20 % of 2.150", () => {
    expect(simulate(haider, today, neutral).savingsCents).toBe(43000);
  });

  test("extra expenses come off and extra income comes on top", () => {
    expect(simulate(haider, today, { ...neutral, extraExpensesCents: 10000 }).savingsCents).toBe(33000);
    expect(simulate(haider, today, { ...neutral, extraIncomeCents: 5000 }).savingsCents).toBe(48000);
  });

  test("savings never go below zero", () => {
    expect(simulate(haider, today, { ...neutral, extraExpensesCents: 100000 }).savingsCents).toBe(0);
  });

  test("a picked amount ignores the extras", () => {
    expect(simulate(haider, today, { ...neutral, savingsCents: 20000, extraIncomeCents: 50000 }).savingsCents).toBe(20000);
  });

  test("the income mode changes what the room is: careful counts the low amount of variable income", () => {
    expect(simulate(student, today, { ...neutral, incomeMode: "careful" }).savingsCents).toBe(19500); // 260 - 65
    expect(simulate(student, today, neutral).savingsCents).toBe(45500); // 520 - 65
  });
});

describe("simulate: fill months (spec 5.4)", () => {
  test("untouched, it shows what the overview shows", () => {
    const { fills } = simulate(haider, today, neutral);
    const shown = Object.fromEntries(buildDashboard(haider, today).goals.map((g) => [g.id, g.fill]));
    expect(fills).toEqual(shown);
    expect(fills.reis).toEqual({ year: 2027, month: 5 });
  });

  test("saving more fills a pot earlier", () => {
    const slow = simulate(haider, today, neutral).fills.reis as { year: number; month: number };
    const fast = simulate(haider, today, { ...neutral, savingsCents: 200000 }).fills.reis as { year: number; month: number };
    expect(monthIndex(fast)).toBeLessThan(monthIndex(slow));
  });

  test("saving nothing fills nothing within the horizon", () => {
    expect(simulate(haider, today, { ...neutral, savingsCents: 0 }).fills).toEqual({ nood: null, reis: null });
  });

  test("it does not change the data it was given", () => {
    const before = JSON.stringify(haider);
    simulate(haider, today, { ...neutral, savingsCents: 99900 });
    expect(JSON.stringify(haider)).toBe(before);
  });
});
