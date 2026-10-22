import type { ISODate, YearMonth } from "./types";

// Plain UTC arithmetic on 'YYYY-MM-DD' strings; no date library.
const DAY_MS = 86_400_000;
const MONTHS_NL = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function daysInMonth(ym: YearMonth): number {
  return new Date(Date.UTC(ym.year, ym.month, 0)).getUTCDate();
}

export function weekdayOf(d: ISODate): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return (new Date(`${d}T00:00:00Z`).getUTCDay() || 7) as 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = monday
}

export function addDays(d: ISODate, n: number): ISODate {
  return new Date(Date.parse(d) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return (Date.parse(b) - Date.parse(a)) / DAY_MS;
}

export function toYearMonth(d: ISODate): YearMonth {
  return { year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) };
}

export function monthIndex(ym: YearMonth): number {
  return ym.year * 12 + ym.month - 1;
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const i = monthIndex(ym) + n;
  return { year: Math.floor(i / 12), month: (((i % 12) + 12) % 12) + 1 };
}

export function monthsInclusive(from: YearMonth, to: YearMonth): number {
  return Math.max(1, monthIndex(to) - monthIndex(from) + 1);
}

export function formatMonthNl(ym: YearMonth): string {
  return `${MONTHS_NL[ym.month - 1]} ${ym.year}`;
}

// 'en-CA' formats as YYYY-MM-DD.
export function todayInTimeZone(timeZone: string, now: Date): ISODate {
  const format = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
  try {
    return format(timeZone);
  } catch {
    return format("Europe/Brussels");
  }
}
