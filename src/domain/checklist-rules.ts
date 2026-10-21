import type { Budget, BudgetWarning } from "./budget";
import type { Certainty, Level } from "./certainty";
import { formatEUR } from "./money";
import { EXTRA_NEEDED_CAP, type GoalStatus } from "./projection";
import type { Cents, Income, ISODate } from "./types";

export type RuleGoal = { id: string; name: string; status: GoalStatus | null; extraNeededCents: Cents; targetIsEstimate: boolean };
export type RuleContext = {
  periodStart: ISODate;
  nextPayday: ISODate | null;
  depositDueCents: Cents;
  budget: Budget;
  warnings: BudgetWarning[];
  goals: RuleGoal[];
  incomes: Income[];
  prefs: { firstJob?: boolean; noInterestSavings?: boolean };
};
export type Urgency = "week" | "month" | "later";
export type RuleItem = { key: string; title: string; urgency: Urgency; certainty: Certainty };

const URGENCY_RANK: Record<Urgency, number> = { week: 0, month: 1, later: 2 };
const dayMonth = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", timeZone: "UTC" });

// Spec 5.8. Computed on every render and never stored while open; the UI hides keys the user ticked or dismissed.
export function evaluateRules(ctx: RuleContext): RuleItem[] {
  const { periodStart, nextPayday, depositDueCents, warnings, goals, incomes, prefs } = ctx;
  const items: RuleItem[] = [];
  const add = (key: string, title: string, urgency: Urgency, level: Level, reason: string) =>
    items.push({ key, title, urgency, certainty: { level, reason } });
  const hasIncome = (kind: Income["kind"]) => incomes.some((i) => i.active && i.kind === kind);

  if (depositDueCents > 0) {
    const on = nextPayday ? ` op ${dayMonth.format(new Date(`${nextPayday}T00:00:00Z`))}` : "";
    add(`deposit:${periodStart}`, `Zet ${formatEUR(depositDueCents)} opzij${on}`, "week", 4, "Berekend uit jouw inkomen en uitgaven");
  }
  for (const w of warnings) {
    if (w.key === "negative_budget") {
      add(w.key, "Je geeft meer uit dan je verdient: kijk je vaste kosten na", "week", 4, "Berekend uit jouw inkomen en uitgaven");
    } else {
      add(w.key, `Je wil ${formatEUR(w.wantCents)} sparen maar houdt ${formatEUR(w.roomCents)} over`, "week", 4, "Berekend uit jouw inkomen en uitgaven");
    }
  }
  add("standing_order", "Zet een automatische overschrijving klaar op je loondag", "month", 4, "Berekend uit jouw loondag");
  for (const g of goals) {
    if (g.status === "niet_haalbaar") {
      const title =
        g.extraNeededCents >= EXTRA_NEEDED_CAP
          ? `Verschuif de deadline van ${g.name}: met sparen alleen lukt het niet meer`
          : `Spaar ${formatEUR(g.extraNeededCents)} meer per maand of verschuif de deadline van ${g.name}`;
      add(`goal_unreachable:${g.id}`, title, "month", 4, "Berekend uit jouw plan en deadline");
    }
    if (g.targetIsEstimate) add(`estimate:${g.id}`, `Zoek de echte prijs van ${g.name} op`, "later", 2, "Het doelbedrag is een schatting");
  }
  if (prefs.firstJob) add("ziekenfonds", "Sluit aan bij een ziekenfonds als titularis", "month", 3, "Een regel die kan veranderen");
  if (hasIncome("student")) add("student_hours", "Hou je studentenuren bij: studentenarbeid heeft een jaarlimiet", "month", 3, "Een regel die kan veranderen");
  if (hasIncome("side")) add("side_income_tax", "Zet een deel van je bijverdienste opzij voor belasting", "month", 3, "Een regel die kan veranderen");
  if (prefs.noInterestSavings) add("no_interest", "Kies een spaarpot zonder rente bij je bank", "month", 3, "Een regel die kan veranderen");

  return items.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]); // stable: table order within an urgency
}
