import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { ArchivedGoals } from "@/components/goals/archived-goals";
import { SortableGoals } from "@/components/goals/sortable-goals";
import { Button } from "@/components/ui/button";
import { loadScreenData } from "@/data/load";
import { buildDashboard } from "@/domain/dashboard";

export const metadata: Metadata = { title: "Doelen" };

// Spec 8.4: the pots with balance, progress and fill month, in the order of their priority.
export default async function GoalsPage() {
  const { today, data } = await loadScreenData();
  const d = buildDashboard(data, today);
  const archived = data.goals.filter((g) => g.archived);
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
          <SortableGoals goals={d.goals} horizonYears={Math.floor(d.horizon / 12)} />
        )}
        {archived.length > 0 && <ArchivedGoals goals={archived.map((g) => ({ id: g.id, name: g.name, colorToken: g.colorToken }))} />}
      </div>
      <BottomNav active="doelen" />
    </>
  );
}
