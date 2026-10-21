import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { Step5 } from "@/components/onboarding/step-5";
import { PlanSettingsForm } from "@/components/settings/plan-settings";
import { loadScreenData } from "@/data/load";

export const metadata: Metadata = { title: "Spaarplan" };

// Spec 8.7: living costs and the savings amount (onboarding step 5), then how the plan counts. The savings field shows the
// proposal while nothing is stored; only an amount the user types is saved. Pots and their deadlines are edited in Doelen.
export default async function SavingsPlanPage() {
  const { data } = await loadScreenData();
  return (
    <>
      <div className="flex flex-col gap-8">
        <Step5 mode="edit" incomes={data.incomes} lines={data.lines} plan={data.plan} />
        <PlanSettingsForm
          plan={data.plan}
          variableIncome={data.incomes.some((i) => i.active && i.variability === "variable")}
          hasDeadline={data.goals.some((g) => !g.archived && g.deadline !== null)}
        />
      </div>
      <BottomNav active="meer" />
    </>
  );
}
