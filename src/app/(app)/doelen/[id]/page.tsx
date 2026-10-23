import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { BottomNav } from "@/components/bottom-nav";
import { CertaintyMeter } from "@/components/certainty-meter";
import { GoalActions } from "@/components/goals/goal-actions";
import { History } from "@/components/goals/history";
import { WayOuts } from "@/components/goals/way-outs";
import { Money } from "@/components/money";
import { fillText, StatusBadge } from "@/components/overview/labels";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { loadScreenData } from "@/data/load";
import { idSchema } from "@/data/schemas";
import { createServerSupabase } from "@/data/supabase/server";
import { buildDashboard } from "@/domain/dashboard";
import { formatMonthNl } from "@/domain/dates";
import { wayOuts } from "@/domain/way-outs";

export const metadata: Metadata = { title: "Doel" };

const HISTORY_LIMIT = 100;

// Spec 8.4: balance, target, deadline, status and the history of one pot, with the buttons that act on it.
export default async function GoalPage({ params }: PageProps<"/doelen/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const { today, data } = await loadScreenData();
  const d = buildDashboard(data, today);
  const goal = d.goals.find((g) => g.id === id);
  if (!goal) notFound();

  const supabase = await createServerSupabase();
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("id, amount_cents, occurred_on, note")
    .eq("goal_id", id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;

  const isEmergency = goal.kind === "emergency";
  return (
    <>
      <div className="flex flex-col gap-4">
        <BackLink href="/doelen" parent="je doelen" />
        <header className="flex flex-col gap-1">
          <h1 tabIndex={-1} className="font-display text-2xl font-semibold break-words outline-none">{goal.name}</h1>
          {(goal.isMain || isEmergency) && <p className="text-sm font-semibold text-ink-2">{[goal.isMain && "Hoofddoel", isEmergency && "Noodfonds"].filter(Boolean).join(" · ")}</p>}
        </header>
        <section aria-label="Stand van dit doel" className="flex flex-col gap-4 rounded-hero bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <Money cents={goal.balanceCents} className="text-[2rem] leading-none" />
            <p className="text-right text-ink-2">
              van <Money cents={goal.targetCents} className="text-ink" />
              {goal.targetIsEstimate && <span className="block text-sm">schatting</span>}
            </p>
          </div>
          <ProgressBar value={goal.isFull ? 1 : goal.balanceCents / goal.targetCents} label={`Voortgang ${goal.name}`} />
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold first-letter:uppercase">{fillText(goal.fill, Math.floor(d.horizon / 12))}</p>
            <StatusBadge status={goal.status} />
          </div>
          {goal.status === "niet_haalbaar" && (
            <div className="flex flex-col gap-2 rounded-strip bg-tint p-3">
              <p className="font-semibold">Zo haal je het toch</p>
              <WayOuts ways={wayOuts(d.projectionInput, goal.id)} savingsCents={d.savingsCents} goalId={goal.id} />
            </div>
          )}
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-2">Deadline</dt>
              <dd className="font-semibold">{goal.deadline ? formatMonthNl(goal.deadline) : "Geen"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-2">Deze maand al opzij</dt>
              <dd>
                <Money cents={goal.bookedCents} /> van <Money cents={goal.allocatedCents} />
              </dd>
            </div>
          </dl>
          <CertaintyMeter level={goal.fillCertainty.level} reason={goal.fillCertainty.reason} />
        </section>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild size="lg">
            <Link href={`/storten?pot=${goal.id}`}>Storten</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/storten?pot=${goal.id}&soort=opname`}>Opnemen</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <Link href={`/doelen/${goal.id}/aanpassen`}>Aanpassen</Link>
          </Button>
          <GoalActions id={goal.id} isMain={goal.isMain} isEmergency={isEmergency} />
        </div>
        <History
          bookings={(rows ?? []).map((r) => ({ id: r.id, amountCents: r.amount_cents, occurredOn: r.occurred_on, note: r.note }))}
          balanceCents={goal.balanceCents}
        />
      </div>
      <BottomNav active="doelen" />
    </>
  );
}
