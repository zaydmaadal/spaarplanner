import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { Checklist } from "@/components/plan/checklist";
import { checklistGroups } from "@/components/plan/helpers";
import { Timeline } from "@/components/plan/timeline";
import { loadOpenUserSteps, loadScreenData } from "@/data/load";
import { buildDashboard } from "@/domain/dashboard";

export const metadata: Metadata = { title: "Plan" };

// Spec 8.6: when each pot fills, and what is left to do. The rule steps are computed here; the steps the user wrote come
// from the database. Closed rule steps (the rows that keep a key from coming back) are never listed.
export default async function PlanPage() {
  const [{ today, data }, own] = await Promise.all([loadScreenData(), loadOpenUserSteps()]);
  const d = buildDashboard(data, today);
  return (
    <>
      <div className="flex flex-col gap-4 lg:gap-6">
        <h1 className="font-display text-3xl font-bold">Plan</h1>
        <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
          <Timeline goals={d.goals} horizonYears={Math.floor(d.horizon / 12)} />
          <Checklist groups={checklistGroups(d.rules, own)} />
        </div>
      </div>
      <BottomNav active="plan" />
    </>
  );
}
