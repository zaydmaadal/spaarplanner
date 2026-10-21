import { describe, expect, test } from "vitest";
import { addDays, addMonths, daysBetween, formatMonthNl, monthsInclusive, todayInTimeZone, weekdayOf } from "./dates";
import { currentPeriod, nextPayday, paydayInMonth, periodProgress, primaryPaydayRule } from "./payday";
import type { Income, PaydayRule } from "./types";

const d31b = { type: "day_of_month", day: 31, weekend: "before" } as const;
const d31a = { type: "day_of_month", day: 31, weekend: "after" } as const;
const d29 = { type: "day_of_month", day: 29, weekend: "before" } as const;

describe("dates", () => {
  test("weekday, addDays, daysBetween and addMonths cross month, year and leap boundaries", () => {
    expect(weekdayOf("2026-10-25")).toBe(7); // sunday
    expect(weekdayOf("2026-10-26")).toBe(1);
    expect(addDays("2027-12-30", 3)).toBe("2028-01-02");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(daysBetween("2026-10-20", "2026-10-29")).toBe(9);
    expect(daysBetween("2026-10-29", "2026-10-20")).toBe(-9);
    expect(addMonths({ year: 2026, month: 11 }, 3)).toEqual({ year: 2027, month: 2 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
  test("formatMonthNl, monthsInclusive", () => {
    expect(formatMonthNl({ year: 2027, month: 1 })).toBe("jan 2027");
    expect(monthsInclusive({ year: 2026, month: 11 }, { year: 2027, month: 1 })).toBe(3);
    expect(monthsInclusive({ year: 2026, month: 11 }, { year: 2026, month: 9 })).toBe(1);
  });
  test("todayInTimeZone", () => {
    expect(todayInTimeZone("Europe/Brussels", new Date("2026-10-24T23:30:00Z"))).toBe("2026-10-25");
    expect(todayInTimeZone("Europe/Brussels", new Date("2026-03-29T00:30:00Z"))).toBe("2026-03-29");
    expect(todayInTimeZone("Not/AZone", new Date("2026-10-24T23:30:00Z"))).toBe("2026-10-25");
  });
});

describe("paydayInMonth", () => {
  test("clamps to the month length, then shifts a weekend", () => {
    expect(paydayInMonth(d31b, { year: 2027, month: 2 })).toBe("2027-02-26");
    expect(paydayInMonth(d31a, { year: 2027, month: 2 })).toBe("2027-02-26"); // never into March
    expect(paydayInMonth(d31a, { year: 2027, month: 1 })).toBe("2027-01-29"); // 31 jan is sunday
    expect(paydayInMonth({ type: "day_of_month", day: 3, weekend: "after" }, { year: 2026, month: 10 })).toBe("2026-10-05");
    expect(paydayInMonth({ type: "day_of_month", day: 3, weekend: "before" }, { year: 2026, month: 10 })).toBe("2026-10-02");
    expect(paydayInMonth({ type: "last_working_day" }, { year: 2026, month: 10 })).toBe("2026-10-30");
    expect(paydayInMonth(d29, { year: 2026, month: 10 })).toBe("2026-10-29");
  });
  test("irregular and weekday rules have no monthly payday", () => {
    expect(paydayInMonth({ type: "irregular" }, { year: 2026, month: 10 })).toBeNull();
    expect(paydayInMonth({ type: "weekday", weekday: 5 }, { year: 2026, month: 10 })).toBeNull();
  });
});

describe("nextPayday", () => {
  test("first payday on or after today", () => {
    expect(nextPayday(d29, "2026-10-20")).toBe("2026-10-29");
    expect(nextPayday(d29, "2026-10-29")).toBe("2026-10-29");
    expect(nextPayday(d29, "2026-10-30")).toBe("2026-11-27"); // 29 nov is sunday
  });
  test("null without a payday", () => {
    expect(nextPayday(null, "2026-10-20")).toBeNull();
    expect(nextPayday({ type: "irregular" }, "2026-10-20")).toBeNull();
  });
});

describe("currentPeriod and periodProgress", () => {
  test("runs from the latest payday to the day before the next", () => {
    expect(currentPeriod(d29, "2026-10-20")).toEqual({ start: "2026-09-29", end: "2026-10-28", month: { year: 2026, month: 9 } });
    expect(currentPeriod(d29, "2026-10-29").start).toBe("2026-10-29");
  });
  test("without a payday it is the calendar month", () => {
    expect(currentPeriod(null, "2026-10-20")).toEqual({ start: "2026-10-01", end: "2026-10-31", month: { year: 2026, month: 10 } });
  });
  test("a 'before' payday that lands in the previous month still anchors the period", () => {
    const d1 = { type: "day_of_month", day: 1, weekend: "before" } as const;
    expect(paydayInMonth(d1, { year: 2026, month: 3 })).toBe("2026-02-27"); // 1 mar is sunday
    expect(currentPeriod(d1, "2026-02-28")).toEqual({ start: "2026-02-27", end: "2026-03-31", month: { year: 2026, month: 2 } });
    expect(nextPayday(d1, "2026-02-28")).toBe("2026-04-01");
  });
  test("progress is the share of days elapsed", () => {
    expect(periodProgress(currentPeriod(d29, "2026-10-20"), "2026-10-20")).toBeCloseTo(0.7);
  });
});

describe("primaryPaydayRule", () => {
  const income = (over: Partial<Income>): Income => ({
    id: "i",
    name: "i",
    kind: "salary",
    frequency: "monthly",
    amountCents: 0,
    amountLowCents: null,
    variability: "fixed",
    month: null,
    date: null,
    paydayRule: { type: "irregular" },
    isEstimate: false,
    active: true,
    ...over,
  });
  const day = (n: number): PaydayRule => ({ type: "day_of_month", day: n, weekend: "before" });

  test("picks the rule of the largest monthly income with a fixed payday", () => {
    const salary = income({ amountCents: 215000, paydayRule: day(29) });
    const side = income({ kind: "side", amountCents: 30000, paydayRule: day(5) });
    const student = income({ kind: "student", frequency: "weekly", amountCents: 900000, paydayRule: { type: "weekday", weekday: 5 } });
    expect(primaryPaydayRule([side, student, salary])).toEqual(day(29));
  });
  test("is null when only irregular incomes exist", () => {
    expect(primaryPaydayRule([income({ amountCents: 50000 }), income({ amountCents: 90000 })])).toBeNull();
    expect(primaryPaydayRule([])).toBeNull();
  });
  test("a variable income compares on amountCents, not amountLowCents", () => {
    const variable = income({ variability: "variable", amountCents: 200000, amountLowCents: 50000, paydayRule: day(10) });
    const fixed = income({ amountCents: 150000, paydayRule: { type: "last_working_day" } });
    expect(primaryPaydayRule([fixed, variable])).toEqual(day(10));
  });
  test("ignores inactive incomes", () => {
    const off = income({ amountCents: 300000, paydayRule: day(1), active: false });
    const on = income({ amountCents: 100000, paydayRule: day(15) });
    expect(primaryPaydayRule([off, on])).toEqual(day(15));
  });
});
