import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { BottomNav } from "@/components/bottom-nav";
import { GoalForm } from "@/components/goals/goal-form";
import { loadScreenData } from "@/data/load";
import { idSchema } from "@/data/schemas";

export const metadata: Metadata = { title: "Doel aanpassen" };

// ?deadline=2027-03 and ?doelbedrag=600 fill in a way out of the goal screen; the preview then shows what it does.
export default async function EditGoalPage({ params, searchParams }: PageProps<"/doelen/[id]/aanpassen">) {
  const { id } = await params;
  const { deadline, doelbedrag } = await searchParams;
  const suggested = {
    deadline: typeof deadline === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(deadline) ? deadline : undefined,
    target: typeof doelbedrag === "string" && /^\d{1,9}$/.test(doelbedrag) ? doelbedrag : undefined,
  };
  const { today, data } = await loadScreenData();
  const goal = idSchema.safeParse(id).success ? data.goals.find((g) => g.id === id && !g.archived) : undefined;
  if (!goal) notFound();
  return (
    <>
      <div className="flex flex-col gap-4">
        <BackLink href={`/doelen/${goal.id}`} parent="het doel" />
        <h1 className="font-display text-2xl font-semibold">Doel aanpassen</h1>
        <GoalForm key={`${goal.id}-${suggested.deadline}-${suggested.target}`} data={data} today={today} goal={goal} suggested={suggested} />
      </div>
      <BottomNav active="doelen" />
    </>
  );
}
