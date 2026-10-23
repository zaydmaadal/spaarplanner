import { toBudgetLine, toGoal, toIncome, toPlan, toProfile } from "@/data/mappers";
import { createServerSupabase, readProfile, requireUserId } from "@/data/supabase/server";
import { depositsInPeriod, type UserData } from "@/domain/dashboard";
import { URGENCY_RANK, type Urgency } from "@/domain/checklist-rules";
import { addDays, todayInTimeZone } from "@/domain/dates";
import { currentPeriod, primaryPaydayRule } from "@/domain/payday";
import type { ISODate } from "@/domain/types";

// A period is at most about a month long and contains today. The today of the user is only known once the profile is
// in and can differ a day from the UTC date, so the window counts back from the UTC date with a day to spare; the
// exact period is applied in memory. That puts the profile and all data in one parallel round trip.
const TRANSACTION_WINDOW_DAYS = 63;

// A failed query throws: the page shows its error card with a retry button (spec 8.8) instead of wrong numbers.
function must<T>({ data, error }: { data: T | null; error: Error | null }): T {
  if (error || data === null) throw error ?? new Error("Missing row");
  return data;
}

// What every screen starts with: today in the time zone of the user, and their data as of that day, RLS-scoped to the
// signed-in user. Redirects to the login page without a session.
export async function loadScreenData(): Promise<{ today: ISODate; data: UserData }> {
  const userId = await requireUserId();
  const supabase = await createServerSupabase();
  const since = addDays(new Date().toISOString().slice(0, 10), -TRANSACTION_WINDOW_DAYS);
  const [profile, plan, incomes, lines, goals, balances, transactions, closed] = await Promise.all([
    readProfile(userId),
    supabase.from("plans").select("*").single(),
    supabase.from("income_sources").select("*").order("name").order("id"),
    supabase.from("budget_lines").select("*").order("sort").order("name").order("id"),
    supabase.from("goals").select("*").order("priority").order("created_at").order("id"),
    supabase.from("goal_balances").select("goal_id, balance_cents"),
    supabase.from("transactions").select("goal_id, amount_cents, occurred_on, source").gte("occurred_on", since),
    supabase.from("checklist_items").select("rule_key").not("rule_key", "is", null).or("done_at.not.is.null,dismissed_at.not.is.null"),
  ]);
  if (!profile) throw new Error("Missing profile");

  const today = todayInTimeZone(profile.timezone, new Date());
  const mappedIncomes = must(incomes).map(toIncome);
  const balanceOf = new Map(must(balances).map((r) => [r.goal_id, r.balance_cents ?? 0]));
  const period = currentPeriod(primaryPaydayRule(mappedIncomes), today);
  const data: UserData = {
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
  return { today, data };
}

export type OpenStep = { id: string; title: string; urgency: Urgency };

// The open steps the user wrote down (Overview and Plan), most urgent first. The table has no creation date, so the
// database sorts by id, and the sort below is stable, so the order is the same on every load.
export async function loadOpenUserSteps(): Promise<OpenStep[]> {
  await requireUserId();
  const supabase = await createServerSupabase();
  const rows = must(
    await supabase
      .from("checklist_items")
      .select("id, title, urgency")
      .eq("source", "user")
      .is("done_at", null)
      .is("dismissed_at", null)
      .order("id"),
  );
  // The CHECK constraint on the column limits urgency to the three values of Urgency.
  return (rows as OpenStep[]).sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
}
