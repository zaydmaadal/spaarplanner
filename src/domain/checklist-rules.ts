import type { Budget, BudgetWarning } from "./budget";
import type { Certainty, Level } from "./certainty";
import { formatEUR } from "./money";
import { EXTRA_NEEDED_CAP, type GoalStatus } from "./projection";
import type { Cents, Income, ISODate, Ziekenfonds } from "./types";

export type RuleGoal = { id: string; name: string; status: GoalStatus | null; extraNeededCents: Cents; targetIsEstimate: boolean; isEmergency: boolean };
export type RuleContext = {
  periodStart: ISODate;
  nextPayday: ISODate | null;
  depositDueCents: Cents;
  savingsLevel: Level; // certainty of the savings amount the deposit comes from
  budget: Budget;
  warnings: BudgetWarning[];
  goals: RuleGoal[];
  incomes: Income[];
  prefs: { ziekenfonds?: Ziekenfonds; noInterestSavings?: boolean };
};
export type Urgency = "week" | "month" | "later";
export type RuleItem = { key: string; title: string; urgency: Urgency; certainty: Certainty };

// What to do about a goal that is not full in time (also shown on the goal screens). The cap means no amount per month is enough.
export const goalUnreachableTitle = (name: string, extraNeededCents: Cents) =>
  extraNeededCents >= EXTRA_NEEDED_CAP
    ? `Verschuif de deadline van ${name}: met sparen alleen lukt het niet meer`
    : `Spaar ${formatEUR(extraNeededCents)} meer per maand of verschuif de deadline van ${name}`;

export const URGENCY_RANK: Record<Urgency, number> = { week: 0, month: 1, later: 2 };
export const URGENCY_LABEL: Record<Urgency, string> = { week: "Deze week", month: "Deze maand", later: "Later" };
const dayMonth = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", timeZone: "UTC" });

// Spec 5.8. Computed on every render and never stored while open; the UI hides keys the user ticked or dismissed.
export function evaluateRules(ctx: RuleContext): RuleItem[] {
  const { periodStart, nextPayday, depositDueCents, savingsLevel, warnings, goals, incomes, prefs } = ctx;
  const items: RuleItem[] = [];
  const add = (key: string, title: string, urgency: Urgency, level: Level, reason: string) =>
    items.push({ key, title, urgency, certainty: { level, reason } });
  const hasIncome = (kind: Income["kind"]) => incomes.some((i) => i.active && i.kind === kind);

  if (depositDueCents > 0) {
    const on = nextPayday ? ` op ${dayMonth.format(new Date(`${nextPayday}T00:00:00Z`))}` : "";
    add(`deposit:${periodStart}`, `Zet ${formatEUR(depositDueCents)} opzij${on}`, "week", savingsLevel, "Berekend uit jouw inkomen en uitgaven");
  }
  for (const w of warnings) {
    if (w.key === "negative_budget") {
      add(w.key, "Je geeft meer uit dan je verdient: kijk je vaste kosten na", "week", 4, "Berekend uit jouw inkomen en uitgaven");
    } else {
      add(w.key, `Je wil ${formatEUR(w.wantCents)} sparen maar houdt ${formatEUR(w.roomCents)} over`, "week", 4, "Berekend uit jouw inkomen en uitgaven");
    }
  }
  if (nextPayday) add("standing_order", "Zet een automatische overschrijving klaar op je loondag", "month", 4, "Berekend uit jouw loondag");
  for (const g of goals) {
    if (g.status === "niet_haalbaar") {
      add(`goal_unreachable:${g.id}`, goalUnreachableTitle(g.name, g.extraNeededCents), "month", 4, "Berekend uit jouw plan en deadline");
    }
    if (g.targetIsEstimate) {
      const title = g.isEmergency ? "Kijk na of je noodfonds groot genoeg is" : `Zoek de echte prijs van ${g.name} op`;
      add(`estimate:${g.id}`, title, "later", 2, "Het doelbedrag is een schatting");
    }
  }
  if (prefs.ziekenfonds === "nee") add("ziekenfonds", "Sluit aan bij een ziekenfonds", "month", 3, "Een regel die kan veranderen");
  if (prefs.ziekenfonds === "weet_niet") add("ziekenfonds", "Check of je bij een ziekenfonds zit", "month", 3, "Een regel die kan veranderen");
  if (hasIncome("student")) add("student_hours", "Hou je studentenuren bij: studentenarbeid heeft een jaarlimiet", "month", 3, "Een regel die kan veranderen");
  if (hasIncome("side")) add("side_income_tax", "Zet een deel van je bijverdienste opzij voor belasting", "month", 3, "Een regel die kan veranderen");
  if (prefs.noInterestSavings) add("no_interest", "Kies een spaarpot zonder rente bij je bank", "month", 3, "Een regel die kan veranderen");

  return items.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]); // stable: table order within an urgency
}
