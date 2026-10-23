import { addDays, addMonths, daysBetween, daysInMonth, toYearMonth, weekdayOf } from "./dates";
import type { Income, ISODate, PaydayRule, YearMonth } from "./types";

export type Period = { start: ISODate; end: ISODate; month: YearMonth };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (ym: YearMonth, day: number): ISODate => `${ym.year}-${pad(ym.month)}-${pad(day)}`;

// shortcut: Belgian public holidays are not counted, add them when a user gets a wrong reminder.
export function paydayInMonth(rule: PaydayRule, ym: YearMonth): ISODate | null {
  const last = daysInMonth(ym);
  if (rule.type === "last_weekday") return iso(ym, last - ((weekdayOf(iso(ym, last)) - rule.weekday + 7) % 7));
  if (rule.type !== "day_of_month" && rule.type !== "last_working_day") return null;
  const day = rule.type === "last_working_day" ? last : Math.min(rule.day, last);
  const wd = weekdayOf(iso(ym, day));
  const after = rule.type === "day_of_month" && rule.weekend === "after";
  // To the next monday or the previous friday; the other direction when the first would leave the month.
  const [prefer, other] = wd < 6 ? [0, 0] : after ? [8 - wd, 5 - wd] : [5 - wd, 8 - wd];
  const target = day + prefer;
  return iso(ym, target >= 1 && target <= last ? target : day + other);
}

// Ascending paydays of the previous, current and next month; each month has exactly one.
function paydaysAround(rule: PaydayRule, ym: YearMonth): ISODate[] {
  return [-1, 0, 1]
    .map((n) => paydayInMonth(rule, addMonths(ym, n)))
    .filter((p): p is ISODate => p !== null);
}

export function nextPayday(rule: PaydayRule | null, today: ISODate): ISODate | null {
  if (!rule) return null;
  return paydaysAround(rule, toYearMonth(today)).find((p) => p >= today) ?? null;
}

export function currentPeriod(rule: PaydayRule | null, today: ISODate): Period {
  const ym = toYearMonth(today);
  const days = rule ? paydaysAround(rule, ym) : [];
  const start = days.filter((p) => p <= today).at(-1);
  const next = days.find((p) => p > today);
  if (start && next) return { start, end: addDays(next, -1), month: toYearMonth(start) };
  return { start: iso(ym, 1), end: iso(ym, daysInMonth(ym)), month: ym };
}

export function periodProgress(p: Period, today: ISODate): number {
  return daysBetween(p.start, today) / (daysBetween(p.start, p.end) + 1);
}

// The largest active monthly income with a fixed payday rule; compares on amountCents, ties keep the first.
export function primaryPaydayRule(incomes: Income[]): PaydayRule | null {
  let best: Income | null = null;
  for (const i of incomes) {
    const fixedDay = ["day_of_month", "last_working_day", "last_weekday"].includes(i.paydayRule.type);
    if (i.active && i.frequency === "monthly" && fixedDay && (!best || i.amountCents > best.amountCents)) best = i;
  }
  return best?.paydayRule ?? null;
}
