import { toBudgetLine, toGoal, toIncome, toPlan, toProfile } from "@/data/mappers";
import { createServerSupabase, readProfile, requireUserId } from "@/data/supabase/server";
import { depositsInPeriod, type UserData } from "@/domain/dashboard";
import { addDays } from "@/domain/dates";
import { currentPeriod, primaryPaydayRule } from "@/domain/payday";
import type { ISODate } from "@/domain/types";

// A period is at most about a month long and contains today, so 62 days back always covers it; the exact
// period is only known once the incomes are in, and this keeps the load to one parallel round trip.
const TRANSACTION_WINDOW_DAYS = 62;

// A failed query throws: the page shows its error card with a retry button (spec 8.8) instead of wrong numbers.
function must<T>({ data, error }: { data: T | null; error: Error | null }): T {
  if (error || data === null) throw error ?? new Error("Missing row");
  return data;
}

// Everything the screens need, RLS-scoped to the signed-in user. Redirects to the login page without a session.
export async function loadUserData(today: ISODate): Promise<UserData> {
  const userId = await requireUserId();
  const supabase = await createServerSupabase();
  const [profile, plan, incomes, lines, goals, balances, transactions, closed] = await Promise.all([
    readProfile(userId),
    supabase.from("plans").select("*").single(),
    supabase.from("income_sources").select("*").order("name").order("id"),
    supabase.from("budget_lines").select("*").order("sort").order("name").order("id"),
    supabase.from("goals").select("*").order("priority").order("created_at").order("id"),
    supabase.from("goal_balances").select("goal_id, balance_cents"),
    supabase.from("transactions").select("goal_id, amount_cents, occurred_on, source").gte("occurred_on", addDays(today, -TRANSACTION_WINDOW_DAYS)),
    supabase.from("checklist_items").select("rule_key").not("rule_key", "is", null).or("done_at.not.is.null,dismissed_at.not.is.null"),
  ]);
  if (!profile) throw new Error("Missing profile");

  const mappedIncomes = must(incomes).map(toIncome);
  const balanceOf = new Map(must(balances).map((r) => [r.goal_id, r.balance_cents ?? 0]));
  const period = currentPeriod(primaryPaydayRule(mappedIncomes), today);
  return {
    profile: toProfile(profile),
    plan: toPlan(must(plan)),
    incomes: mappedIncomes,
    lines: must(lines).map(toBudgetLine),
    goals: must(goals).map((g) => toGoal(g, balanceOf.get(g.id) ?? 0)),
    depositsThisPeriod: depositsInPeriod(
      must(transactions).map((t) => ({
        goalId: t.goal_id,
        amountCents: t.amount_cents,
        occurredOn: t.occurred_on,
        source: t.source as "manual" | "start" | "import" | "ai",
      })),
      period,
    ),
    closedRuleKeys: must(closed).flatMap((r) => (r.rule_key ? [r.rule_key] : [])),
  };
}
