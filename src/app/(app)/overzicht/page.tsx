import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { longDateNl } from "@/components/overview/labels";
import { MainGoalCard } from "@/components/overview/main-goal-card";
import { NextSteps } from "@/components/overview/next-steps";
import { PaydayStrip } from "@/components/overview/payday-strip";
import { PotsList } from "@/components/overview/pots-list";
import { SalarySplit } from "@/components/overview/salary-split";
import { Simulator } from "@/components/overview/simulator";
import { loadOpenUserSteps, loadUserData } from "@/data/load";
import { readProfile, requireUserId } from "@/data/supabase/server";
import { URGENCY_RANK } from "@/domain/checklist-rules";
import { buildDashboard } from "@/domain/dashboard";
import { todayInTimeZone } from "@/domain/dates";

export const metadata: Metadata = { title: "Overzicht" };

const MAX_STEPS = 3; // the rest is in Plan

// Spec 8.3, top to bottom. The data is read here; only the simulator needs the browser.
export default async function OverviewPage() {
  const profile = await readProfile(await requireUserId());
  if (!profile) throw new Error("Missing profile");
  const today = todayInTimeZone(profile.timezone, new Date());

  const [data, own] = await Promise.all([loadUserData(today), loadOpenUserSteps()]);

  const d = buildDashboard(data, today);
  const horizonYears = Math.floor(d.horizon / 12);
  // The most urgent of both (spec 8.3); the sort is stable, so within an urgency the rule steps come first.
  const steps = [...d.rules, ...own.map(({ id, title, urgency }) => ({ key: id, title, urgency }))]
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency])
    .slice(0, MAX_STEPS);
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
        <SalarySplit lines={data.lines} budget={d.budget} savingsCents={d.savingsCents} savingsCertainty={d.savingsCertainty} warnings={d.warnings} />
        <PotsList goals={d.goals} horizonYears={horizonYears} />
        <Simulator key={`${data.plan.monthlySavingsCents}-${data.plan.incomeMode}`} base={data} today={today} savingsCents={d.savingsCents} horizonYears={horizonYears} />
        <NextSteps steps={steps} />
      </div>
      <BottomNav active="overzicht" />
    </>
  );
}
