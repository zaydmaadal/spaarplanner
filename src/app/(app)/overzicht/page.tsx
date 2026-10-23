import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { longDateNl } from "@/components/overview/labels";
import { MainGoalCard } from "@/components/overview/main-goal-card";
import { NextSteps } from "@/components/overview/next-steps";
import { PaydayStrip } from "@/components/overview/payday-strip";
import { PotsList } from "@/components/overview/pots-list";
import { SalarySplit } from "@/components/overview/salary-split";
import { Simulator } from "@/components/overview/simulator";
import { PushCard } from "@/components/push-card";
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
  const steps = [...d.rules, ...own.map(({ id, title, urgency }) => ({ key: id, title, urgency, own: true }))]
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency])
    .slice(0, MAX_STEPS);
  const name = data.profile.displayName.trim();

  const hasPayday = d.nextPayday !== null && d.daysToPayday !== null;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* The dark hero: greeting, payday, the main goal and where the month goes. From 1024 px the goal takes the left column. */}
        <div className="rise relative overflow-hidden rounded-hero bg-hero-bg p-4 text-hero-ink min-[400px]:p-5 lg:p-8">
          <div aria-hidden className="contour pointer-events-none absolute -top-10 -right-10 size-72" />
          <div className="relative grid gap-5 lg:grid-cols-2 lg:gap-x-10">
            <header className="flex flex-col gap-0.5 lg:col-span-2">
              <h1 className="font-display text-3xl font-bold">{name ? `Hoi ${name}` : "Hoi"}</h1>
              <p className="text-hero-muted first-letter:uppercase">{longDateNl(today)}</p>
            </header>
            {d.nextPayday !== null && d.daysToPayday !== null && <PaydayStrip nextPayday={d.nextPayday} daysToPayday={d.daysToPayday} progress={d.progress} className="lg:col-start-2 lg:row-start-2" />}
            {d.mainGoal && <MainGoalCard goal={d.mainGoal} waitsFor={d.mainGoalWaitsFor} horizonYears={horizonYears} className="lg:col-start-1 lg:row-span-2 lg:row-start-2" />}
            <SalarySplit
              lines={data.lines}
              budget={d.budget}
              savingsCents={d.savingsCents}
              savingsCertainty={d.savingsCertainty}
              warnings={d.warnings}
              className={hasPayday ? "lg:col-start-2 lg:row-start-3" : "lg:col-start-2 lg:row-start-2"}
            />
          </div>
        </div>
        <PushCard />
        <PotsList goals={d.goals} horizonYears={horizonYears} />
        <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
          <Simulator key={`${data.plan.monthlySavingsCents}-${data.plan.incomeMode}`} base={data} today={today} savingsCents={d.savingsCents} horizonYears={horizonYears} />
          <NextSteps steps={steps} />
        </div>
      </div>
      <BottomNav active="overzicht" />
    </>
  );
}
