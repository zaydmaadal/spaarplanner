export type Cents = number;
export type ISODate = string; // 'YYYY-MM-DD'
export type YearMonth = { year: number; month: number }; // month 1..12
export type Frequency = "monthly" | "weekly" | "biweekly" | "yearly" | "once";
export type IncomeKind = "salary" | "side" | "student" | "benefit" | "allowance" | "other";
export type Ziekenfonds = "ja" | "nee" | "weet_niet"; // "Ben je al aangesloten bij een ziekenfonds?"
export type PaydayRule =
  | { type: "day_of_month"; day: number; weekend: "before" | "after" }
  | { type: "last_working_day" }
  | { type: "weekday"; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7 } // 1 = monday
  | { type: "last_weekday"; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7 } // the last thursday of the month
  | { type: "irregular" };
export type Income = {
  id: string;
  name: string;
  kind: IncomeKind;
  frequency: Frequency;
  amountCents: Cents;
  amountLowCents: Cents | null;
  variability: "fixed" | "variable";
  month: number | null;
  date: ISODate | null;
  paydayRule: PaydayRule;
  isEstimate: boolean;
  active: boolean;
};
export type BudgetLine = {
  id: string;
  kind: "fixed" | "living" | "free";
  category: string;
  name: string;
  amountCents: Cents;
  isEstimate: boolean;
};
export type GoalKind = "emergency" | "savings" | "trip" | "purchase" | "other";
export type Goal = {
  id: string;
  kind: GoalKind;
  name: string;
  targetCents: Cents;
  targetIsEstimate: boolean;
  balanceCents: Cents;
  deadline: YearMonth | null;
  priority: number;
  weight: number;
  isMain: boolean;
  archived: boolean;
  createdAt: string;
};
export type PlanSettings = {
  monthlySavingsCents: Cents | null;
  emergencySharePct: number;
  incomeMode: "careful" | "normal";
  includeOneOffIncome: boolean;
};
