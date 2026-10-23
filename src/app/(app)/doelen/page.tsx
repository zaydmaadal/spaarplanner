import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { SortableGoals } from "@/components/goals/sortable-goals";
import { Button } from "@/components/ui/button";
import { loadScreenData } from "@/data/load";
import { buildDashboard } from "@/domain/dashboard";

export const metadata: Metadata = { title: "Doelen" };

// Spec 8.4: the pots with balance, progress and fill month, in the order of their priority.
export default async function GoalsPage() {
  const { today, data } = await loadScreenData();
  const d = buildDashboard(data, today);
  const ids = d.goals.map((g) => g.id);
  return (
    <>
      <div className="flex flex-col gap-4 lg:gap-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Doelen</h1>
          <Button asChild>
            <Link href="/doelen/nieuw">Nieuw doel</Link>
          </Button>
        </header>
        {d.goals.length === 0 ? (
          <p className="text-ink-2">Nog geen doelen. Maak je eerste doel.</p>
        ) : (
          // The key starts the list again from the stored order when it changed (a goal added, archived or moved elsewhere).
          <SortableGoals key={ids.join()} goals={d.goals} horizonYears={Math.floor(d.horizon / 12)} />
        )}
      </div>
      <BottomNav active="doelen" />
    </>
  );
}
