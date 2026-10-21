import { allocate } from "./allocation";
import { budgetWarnings, monthlyBudget, oneOffIncomes, savingsPerMonth, suggestedSavings, type Budget, type BudgetWarning } from "./budget";
import { evaluateRules, type RuleItem } from "./checklist-rules";
import { daysBetween } from "./dates";
import { currentPeriod, nextPayday, periodProgress, primaryPaydayRule, type Period } from "./payday";
import { extraNeededCents, fillMonth, goalStatus, horizonFor, project, type GoalStatus, type ProjectionInput } from "./projection";
import type { BudgetLine, Cents, Goal, Income, ISODate, PlanSettings, YearMonth } from "./types";

export type UserData = {
  profile: { displayName: string; timeZone: string; prefs: { firstJob?: boolean; noInterestSavings?: boolean } };
  plan: PlanSettings;
  incomes: Income[];
  lines: BudgetLine[];
  goals: Goal[];
  depositsThisPeriod: Record<string, Cents>; // per goal, filled by the loader for the current period
  closedRuleKeys: string[];
};
export type GoalView = Goal & { isFull: boolean; fill: YearMonth | "full" | null; status: GoalStatus | null; extraNeededCents: Cents; allocatedCents: Cents };
export type Dashboard = {
  today: ISODate;
  period: Period;
  nextPayday: ISODate | null;
  daysToPayday: number | null;
  progress: number;
  budget: Budget;
  savingsCents: Cents;
  savingsIsProposal: boolean; // true when savingsCents is the 20 % suggestion (spec 5.1), not the plan amount or the room
  warnings: BudgetWarning[];
  goals: GoalView[];
  mainGoal: GoalView | null;
  mainGoalWaitsFor: { goalName: string; fill: YearMonth | null } | null;
  depositPrefill: Record<string, Cents>;
  rules: RuleItem[];
  projectionInput: ProjectionInput;
};

// Everything the overview screen shows (spec 5 and 6), from stored data and today's date. Archived goals are left out.
export function buildDashboard(data: UserData, today: ISODate): Dashboard {
  const { profile, plan, incomes, lines, depositsThisPeriod, closedRuleKeys } = data;
  const rule = primaryPaydayRule(incomes);
  const period = currentPeriod(rule, today);
  const next = nextPayday(rule, today);
  const budget = monthlyBudget(incomes, lines, plan.incomeMode);
  // Spec 5.1 standard proposal: with no budget lines and no plan amount the room is just the income, so propose 20 % instead.
  const savingsIsProposal = plan.monthlySavingsCents === null && lines.length === 0;
  const savingsCents = savingsIsProposal ? suggestedSavings(budget.incomeCents) : savingsPerMonth(plan, budget.roomCents);
  const goals = data.goals.filter((g) => !g.archived);
  const deposited = Object.values(depositsThisPeriod).reduce((a, b) => a + b, 0);
  const booked = (g: Goal) => depositsThisPeriod[g.id] ?? 0;

  const projectionInput: ProjectionInput = {
    goals,
    savingsCents,
    emergencySharePct: plan.emergencySharePct,
    startMonth: period.month,
    depositedThisPeriodCents: deposited,
    oneOffs: plan.includeOneOffIncome ? oneOffIncomes(incomes, period.start, period.month, horizonFor(goals, period.month)) : [],
  };
  const { fill } = project(projectionInput);
  // Balances already hold the booked deposits, so only the rest of the savings is divided; adding the booked part back
  // makes allocatedCents the whole share of this period, which is what "min already booked" (spec 5.8, 6) subtracts again.
  const allocated = allocate(Math.max(0, savingsCents - deposited), goals, plan.emergencySharePct, period.month);

  const views: GoalView[] = goals.map((g) => {
    const status = goalStatus(projectionInput, g.id);
    return {
      ...g,
      isFull: g.balanceCents >= g.targetCents,
      fill: fillMonth(fill[g.id], period.month),
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
    budget,
    warnings,
    goals: views,
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
    warnings,
    goals: views,
    mainGoal,
    mainGoalWaitsFor: waits ? { goalName: fund.name, fill: fund.fill === "full" ? null : fund.fill } : null,
    depositPrefill,
    rules,
    projectionInput,
  };
}
