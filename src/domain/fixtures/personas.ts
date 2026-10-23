import type { UserData } from "../dashboard";
import { goal, income, line, plan } from "../test-helpers";
import type { BudgetLine, Cents, Goal, GoalKind } from "../types";

// Spec 3. Fixtures for the domain tests and the seed; amounts the person did not look up carry the estimate flags.
const profile = (displayName: string, prefs: UserData["profile"]["prefs"] = {}) => ({ displayName, timeZone: "Europe/Brussels", prefs });
const pot = (id: string, name: string, kind: GoalKind, target: Cents, extra: Partial<Goal> = {}): Goal => ({ ...goal(id, target), name, kind, ...extra });
const bl = (id: string, kind: BudgetLine["kind"], category: string, name: string, amountCents: Cents, isEstimate = false): BudgetLine => ({
  ...line(kind, amountCents),
  id,
  category,
  name,
  isEstimate,
});
const base = (): Pick<UserData, "depositsThisPeriod" | "closedRuleKeys"> => ({ depositsThisPeriod: {}, closedRuleKeys: [] }); // fresh objects per persona

// First job, € 1.000 to mama, emergency fund first, long goals, savings without interest.
export const zayd: UserData = {
  ...base(),
  profile: profile("Zayd", { ziekenfonds: "nee", noInterestSavings: true }),
  plan: plan(),
  incomes: [income({ id: "loon", amountCents: 220000, paydayRule: { type: "last_working_day" } })],
  lines: [bl("mama", "fixed", "familie", "Mama", 100000), bl("eigen", "free", "vrij", "Eigen uitgaven", 20000, true)],
  goals: [
    pot("nood", "Noodfonds", "emergency", 360000, { balanceCents: 20000, priority: 1 }),
    pot("hijra", "Hijra", "savings", 1670000, { deadline: { year: 2029, month: 10 }, isMain: true, priority: 2 }),
    pot("huwelijk", "Huwelijk", "other", 650000, { priority: 3, weight: 2, targetIsEstimate: true }),
    pot("reis", "Reis", "trip", 300000, { priority: 4, targetIsEstimate: true }),
    pot("hajj", "Hajj", "other", 900000, { deadline: { year: 2040, month: 10 }, priority: 5, targetIsEstimate: true }),
  ],
};

// First job, no system yet: nothing but income, so the standard proposal applies.
export const haider: UserData = {
  ...base(),
  profile: profile("Haider", { ziekenfonds: "nee" }),
  plan: plan(),
  incomes: [income({ id: "loon", amountCents: 215000, paydayRule: { type: "day_of_month", day: 29, weekend: "before" } })],
  lines: [],
  goals: [
    pot("nood", "Noodfonds", "emergency", 100000, { targetIsEstimate: true, priority: 1 }),
    pot("reis", "Reis", "trip", 250000, { deadline: { year: 2027, month: 8 }, isMain: true, priority: 2, targetIsEstimate: true }),
  ],
};

// Variable weekly pay, counted carefully; "stage vinden" is a checklist item, not a goal.
export const student: UserData = {
  ...base(),
  profile: profile("Student"),
  plan: plan({ incomeMode: "careful" }),
  incomes: [
    income({
      id: "weekendjob",
      name: "Weekendjob",
      kind: "student",
      frequency: "weekly",
      amountCents: 12000,
      amountLowCents: 6000,
      variability: "variable",
      paydayRule: { type: "weekday", weekday: 5 },
      isEstimate: true,
    }),
  ],
  lines: [bl("gsm", "fixed", "abonnementen", "Gsm", 1500), bl("uitgaan", "free", "vrij", "Uitgaan", 5000, true)],
  goals: [
    pot("nood", "Noodfonds", "emergency", 30000, { balanceCents: 5000, targetIsEstimate: true, priority: 1 }),
    pot("reis", "Reis", "trip", 60000, { deadline: { year: 2027, month: 7 }, isMain: true, priority: 2, targetIsEstimate: true }),
  ],
};

// Two salaries, a loan, studies of the children and a pension pot.
export const gezin: UserData = {
  ...base(),
  profile: profile("Gezin"),
  plan: plan({ monthlySavingsCents: 50000 }),
  incomes: [
    income({ id: "loon", amountCents: 260000, paydayRule: { type: "day_of_month", day: 27, weekend: "before" } }),
    income({ id: "loon-partner", name: "Loon partner", amountCents: 190000, paydayRule: { type: "last_working_day" } }),
  ],
  lines: [
    bl("lening", "fixed", "wonen", "Lening", 85000),
    bl("gezin", "living", "leven", "Gezinskosten", 140000, true),
    bl("vrij", "free", "vrij", "Vrije uitgaven", 30000, true),
  ],
  goals: [
    pot("nood", "Noodfonds", "emergency", 765000, { balanceCents: 500000, priority: 1 }),
    pot("studies", "Studiekosten", "savings", 1200000, { deadline: { year: 2030, month: 9 }, isMain: true, priority: 2, targetIsEstimate: true }),
    pot("pensioen", "Pensioen", "savings", 2000000, { priority: 3 }),
  ],
};

// Weekly allowance, no payday, a driving licence to save for.
export const tiener: UserData = {
  ...base(),
  profile: profile("Tiener"),
  plan: plan(),
  incomes: [income({ id: "zakgeld", name: "Zakgeld", kind: "allowance", frequency: "weekly", amountCents: 1500, paydayRule: { type: "irregular" } })],
  lines: [],
  goals: [
    pot("nood", "Noodfonds", "emergency", 5000, { balanceCents: 2000, priority: 1 }),
    pot("rijbewijs", "Rijbewijs", "purchase", 150000, { isMain: true, priority: 2, targetIsEstimate: true }),
  ],
};

// Salary plus a variable side income, with a tax pot that has no deadline.
export const freelancer: UserData = {
  ...base(),
  profile: profile("Freelancer"),
  plan: plan({ incomeMode: "careful" }),
  incomes: [
    income({ id: "loon", amountCents: 200000, paydayRule: { type: "day_of_month", day: 25, weekend: "before" } }),
    income({
      id: "bijberoep",
      name: "Bijberoep",
      kind: "side",
      amountCents: 80000,
      amountLowCents: 30000,
      variability: "variable",
      paydayRule: { type: "irregular" },
      isEstimate: true,
    }),
  ],
  lines: [bl("huur", "fixed", "wonen", "Huur", 85000), bl("leven", "living", "leven", "Leven", 60000, true)],
  goals: [
    pot("nood", "Noodfonds", "emergency", 435000, { balanceCents: 100000, priority: 1 }),
    pot("belasting", "Belasting", "other", 300000, { weight: 2, priority: 2, targetIsEstimate: true }),
  ],
};
