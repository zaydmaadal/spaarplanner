import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { longDateNl } from "@/components/overview/labels";
import { MainGoalCard } from "@/components/overview/main-goal-card";
import { NextSteps } from "@/components/overview/next-steps";
import { PaydayStrip } from "@/components/overview/payday-strip";
import { PotsList } from "@/components/overview/pots-list";
import { SalarySplit } from "@/components/overview/salary-split";
import { Simulator } from "@/components/overview/simulator";
import { loadUserData } from "@/data/load";
import { createServerSupabase, readProfile, requireUserId } from "@/data/supabase/server";
import { buildDashboard } from "@/domain/dashboard";
import { todayInTimeZone } from "@/domain/dates";

export const metadata: Metadata = { title: "Overzicht" };

const URGENCY_ORDER = ["week", "month", "later"];
const MAX_OWN_STEPS = 3; // the rest is in Plan

// Spec 8.3, top to bottom. The data is read here; only the simulator needs the browser.
export default async function OverviewPage() {
  const profile = await readProfile(await requireUserId());
  if (!profile) throw new Error("Missing profile");
  const today = todayInTimeZone(profile.timezone, new Date());

  const supabase = await createServerSupabase();
  const [data, own] = await Promise.all([
    loadUserData(today),
    supabase.from("checklist_items").select("id, title, urgency").eq("source", "user").is("done_at", null).is("dismissed_at", null),
  ]);
  if (own.error) throw own.error;

  const d = buildDashboard(data, today);
  const horizonYears = Math.floor(d.horizon / 12);
  const ownSteps = own.data
    .map(({ id, title, urgency }) => ({ key: id, title, urgency }))
    .sort((a, b) => URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency))
    .slice(0, MAX_OWN_STEPS);
  const name = data.profile.displayName.trim();

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold">{name ? `Hoi ${name}` : "Hoi"}</h1>
          <p className="text-ink-2 first-letter:uppercase">{longDateNl(today)}</p>
        </header>
        {d.nextPayday !== null && d.daysToPayday !== null && <PaydayStrip nextPayday={d.nextPayday} daysToPayday={d.daysToPayday} progress={d.progress} />}
        {d.mainGoal && <MainGoalCard goal={d.mainGoal} waitsFor={d.mainGoalWaitsFor} horizonYears={horizonYears} />}
        <SalarySplit lines={data.lines} budget={d.budget} savingsCents={d.savingsCents} savingsCertainty={d.savingsCertainty} />
        <PotsList goals={d.goals} horizonYears={horizonYears} />
        <Simulator base={data} today={today} savingsCents={d.savingsCents} horizonYears={horizonYears} />
        <NextSteps steps={[...d.rules.slice(0, 3).map(({ key, title, urgency }) => ({ key, title, urgency })), ...ownSteps]} />
      </div>
      <BottomNav active="overzicht" />
    </>
  );
}
