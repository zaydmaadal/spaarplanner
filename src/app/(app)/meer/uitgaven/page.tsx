import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { Step4 } from "@/components/onboarding/step-4";
import { loadScreenData } from "@/data/load";

export const metadata: Metadata = { title: "Uitgaven" };

// Spec 8.7: the fixed costs of onboarding step 4.
export default async function ExpensesPage() {
  const { data } = await loadScreenData();
  return (
    <>
      <Step4 mode="edit" lines={data.lines} />
      <BottomNav active="meer" />
    </>
  );
}
