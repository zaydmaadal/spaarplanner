import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { Step2 } from "@/components/onboarding/step-2";
import { Step3 } from "@/components/onboarding/step-3";
import { loadScreenData } from "@/data/load";

export const metadata: Metadata = { title: "Inkomen" };

// Spec 8.7: onboarding steps 2 (income and extra income) and 3 (one-off income), each with its own "Opslaan".
export default async function IncomePage() {
  const { data } = await loadScreenData();
  return (
    <>
      <div className="flex flex-col gap-8">
        <Step2 mode="edit" incomes={data.incomes} ziekenfonds={data.profile.prefs.ziekenfonds} />
        <Step3 mode="edit" incomes={data.incomes} level={2} />
      </div>
      <BottomNav active="meer" />
    </>
  );
}
