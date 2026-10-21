import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { GoalForm } from "@/components/goals/goal-form";
import { loadScreenData } from "@/data/load";
import { idSchema } from "@/data/schemas";

export const metadata: Metadata = { title: "Doel aanpassen" };

export default async function EditGoalPage({ params }: PageProps<"/doelen/[id]/aanpassen">) {
  const { id } = await params;
  const { today, data } = await loadScreenData();
  const goal = idSchema.safeParse(id).success ? data.goals.find((g) => g.id === id && !g.archived) : undefined;
  if (!goal) notFound();
  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Doel aanpassen</h1>
        <GoalForm key={goal.id} data={data} today={today} goal={goal} />
      </div>
      <BottomNav active="doelen" />
    </>
  );
}
