import { allocate } from "./allocation";
import { budgetWarnings, monthlyBudget, oneOffIncomes, savingsTarget, type Budget, type BudgetWarning } from "./budget";
import { derived, type Certainty } from "./certainty";
import { evaluateRules, type RuleItem } from "./checklist-rules";
import { daysBetween } from "./dates";
import { currentPeriod, nextPayday, periodProgress, primaryPaydayRule, type Period } from "./payday";
import { extraNeededCents, fillMonth, goalStatus, horizonFor, oneOffIn, periodZeroAvailable, project, type GoalStatus, type ProjectionInput } from "./projection";
import type { BudgetLine, Cents, Goal, Income, ISODate, PlanSettings, YearMonth, Ziekenfonds } from "./types";

export type UserData = {
  profile: { displayName: string; timeZone: string; prefs: { ziekenfonds?: Ziekenfonds; noInterestSavings?: boolean } };
  plan: PlanSettings;
  incomes: Income[];
  lines: BudgetLine[];
  goals: Goal[];
  depositsThisPeriod: Record<string, Cents>; // per goal, filled by the loader for the current period
  closedRuleKeys: string[];
};
export type GoalView = Goal & {
  isFull: boolean;
  fill: YearMonth | "full" | null;
  fillCertainty: Certainty;
  status: GoalStatus | null;
  extraNeededCents: Cents;
  allocatedCents: Cents;
};
export type Dashboard = {
  today: ISODate;
  period: Period;
  nextPayday: ISODate | null;
  daysToPayday: number | null;
  progress: number;
  budget: Budget;
  savingsCents: Cents;
  savingsIsProposal: boolean; // true when savingsCents is the 20 % suggestion (spec 5.1), not the plan amount or the room
  savingsCertainty: Certainty;
  warnings: BudgetWarning[];
  goals: GoalView[];
  mainGoal: GoalView | null;
  mainGoalWaitsFor: { goalName: string; fill: YearMonth | null } | null;
  depositPrefill: Record<string, Cents>;
  rules: RuleItem[];
  projectionInput: ProjectionInput;
  horizon: number;
};

type DepositTx = { goalId: string; amountCents: Cents; occurredOn: ISODate; source: "manual" | "start" | "import" | "ai" };

// Booked this period per goal: the start balance is not a deposit, and a withdrawal never takes a goal below 0.
export function depositsInPeriod(txs: DepositTx[], period: Period): Record<string, Cents> {
  const net: Record<string, Cents> = {};
  for (const t of txs) {
    if (t.source !== "start" && t.occurredOn >= period.start && t.occurredOn <= period.end) net[t.goalId] = (net[t.goalId] ?? 0) + t.amountCents;
  }
  return Object.fromEntries(Object.entries(net).map(([id, cents]) => [id, Math.max(0, cents)]));
}

const certaintyReason = (weak: string[]) => (weak.length ? `Schatting: ${weak.join(", ")}` : "Op basis van jouw invoer");

// Everything the overview screen shows (spec 5 and 6), from stored data and today's date. Archived goals are left out.
export function buildDashboard(data: UserData, today: ISODate): Dashboard {
  const { profile, plan, incomes, lines, depositsThisPeriod, closedRuleKeys } = data;
  const rule = primaryPaydayRule(incomes);
  const period = currentPeriod(rule, today);
  const next = nextPayday(rule, today);
  const budget = monthlyBudget(incomes, lines, plan.incomeMode);
  const { cents: savingsCents, isProposal: savingsIsProposal } = savingsTarget(plan, budget, lines.length > 0);
  // Spec 5.7: as sure as the weakest input; the proposal, variable or estimated income and estimated budget lines are estimates.
  const weak = [
    savingsIsProposal && "voorstel van 20 %",
    incomes.some((i) => i.active && (i.isEstimate || i.variability === "variable")) && "inkomen",
    lines.some((l) => l.isEstimate) && "uitgaven",
  ].filter((w) => w !== false);
  const savingsCertainty = derived([weak.length ? 2 : 5], certaintyReason(weak));
  const goals = data.goals.filter((g) => !g.archived);
  const bookedById = (id: string) => Math.max(0, depositsThisPeriod[id] ?? 0); // second guard: depositsInPeriod already clamps
  const deposited = Object.keys(depositsThisPeriod).reduce((sum, id) => sum + bookedById(id), 0);
  const booked = (g: Goal) => bookedById(g.id);

  const projectionInput: ProjectionInput = {
    goals,
    savingsCents,
    emergencySharePct: plan.emergencySharePct,
    startMonth: period.month,
    depositedThisPeriodCents: deposited,
    oneOffs: plan.includeOneOffIncome ? oneOffIncomes(incomes, period.start, period.month, horizonFor(goals, period.month)) : [],
  };
  const { fill, horizon } = project(projectionInput);
  // Balances already hold the booked deposits, so only the rest of the savings is divided; adding the booked part back
  // makes allocatedCents the whole share of this period, which is what "min already booked" (spec 5.8, 6) subtracts again.
  const allocated = allocate(periodZeroAvailable(savingsCents, oneOffIn(projectionInput.oneOffs, period.month), deposited), goals, plan.emergencySharePct, period.month);

  const views: GoalView[] = goals.map((g) => {
    const status = goalStatus(projectionInput, g.id);
    return {
      ...g,
      isFull: g.balanceCents >= g.targetCents,
      fill: fillMonth(fill[g.id], period.month),
      fillCertainty: derived([savingsCertainty.level, g.targetIsEstimate ? 2 : 5], certaintyReason(g.targetIsEstimate ? [...weak, "doelbedrag"] : weak)),
      status,
      extraNeededCents: status === "niet_haalbaar" ? extraNeededCents(projectionInput, g.id) : 0,
      allocatedCents: allocated[g.id] + booked(g),
    };
  });
  const depositPrefill = Object.fromEntries(views.map((g) => [g.id, Math.max(0, g.allocatedCents - booked(g))]));
  const depositDueCents = Object.values(depositPrefill).reduce((a, b) => a + b, 0); // deposits on archived goals were taken off the savings above

  const fund = views.find((g) => g.kind === "emergency");
  const mainGoal = views.find((g) => g.isMain) ?? fund ?? null;
  const waits = mainGoal && fund && mainGoal !== fund && !mainGoal.isFull && mainGoal.allocatedCents === 0 && !fund.isFull && fund.allocatedCents > 0;

  const warnings = budgetWarnings(plan, budget);
  const rules = evaluateRules({
    periodStart: period.start,
    nextPayday: next,
    depositDueCents,
    savingsLevel: savingsCertainty.level,
    budget,
    warnings,
    goals: views.map((g) => ({ ...g, isEmergency: g.kind === "emergency" })),
    incomes,
    prefs: profile.prefs,
  }).filter((r) => !closedRuleKeys.includes(r.key));

  return {
    today,
    period,
    nextPayday: next,
    daysToPayday: next ? daysBetween(today, next) : null,
    progress: periodProgress(period, today),
    budget,
    savingsCents,
    savingsIsProposal,
    savingsCertainty,
    warnings,
    goals: views,
    mainGoal,
    mainGoalWaitsFor: waits ? { goalName: fund.name, fill: fund.fill === "full" ? null : fund.fill } : null,
    depositPrefill,
    rules,
    projectionInput,
    horizon,
  };
}
