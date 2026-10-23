import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { BottomNav } from "@/components/bottom-nav";
import { GoalForm } from "@/components/goals/goal-form";
import { loadScreenData } from "@/data/load";

export const metadata: Metadata = { title: "Nieuw doel" };

export default async function NewGoalPage() {
  const { today, data } = await loadScreenData();
  return (
    <>
      <div className="flex flex-col gap-4">
        <BackLink href="/doelen" parent="je doelen" />
        <h1 className="font-display text-2xl font-semibold">Nieuw doel</h1>
        <GoalForm data={data} today={today} />
      </div>
      <BottomNav active="doelen" />
    </>
  );
}
