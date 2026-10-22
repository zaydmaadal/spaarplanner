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
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Plan</h1>
        <Timeline goals={d.goals} horizonYears={Math.floor(d.horizon / 12)} />
        <Checklist groups={checklistGroups(d.rules, own)} />
      </div>
      <BottomNav active="plan" />
    </>
  );
}
