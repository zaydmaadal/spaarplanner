import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { BottomNav } from "@/components/bottom-nav";
import { CertaintyMeter } from "@/components/certainty-meter";
import { GoalActions } from "@/components/goals/goal-actions";
import { History } from "@/components/goals/history";
import { WayOuts } from "@/components/goals/way-outs";
import { CountUp } from "@/components/count-up";
import { Money } from "@/components/money";
import { fillText, potColor, StatusBadge } from "@/components/overview/labels";
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
    .select("id, amount_cents, occurred_on, note, source")
    .eq("goal_id", id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;

  const isEmergency = goal.kind === "emergency";
  return (
    <>
      <div className="flex flex-col gap-4 lg:gap-6">
        <BackLink href="/doelen" parent="je doelen" />
        <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr] lg:gap-6">
          <div className="flex flex-col gap-4">
            <section aria-label="Stand van dit doel" className="rise relative flex flex-col gap-3 overflow-hidden rounded-hero bg-hero-bg p-4 text-hero-ink min-[400px]:p-5 lg:p-6">
              <div aria-hidden className="contour pointer-events-none absolute -top-10 -right-10 size-72" />
              <header className="relative flex flex-col gap-0.5">
                {(goal.isMain || isEmergency) && <p className="text-xs font-semibold tracking-widest text-hero-accent uppercase">{[goal.isMain && "Hoofddoel", isEmergency && "Noodfonds"].filter(Boolean).join(" · ")}</p>}
                <h1 tabIndex={-1} className="flex items-center gap-2.5 font-display text-3xl font-bold break-words outline-none">
                  <span aria-hidden className="size-3 shrink-0 rounded-full ring-2 ring-hero-ink" style={{ backgroundColor: potColor(goal) }} />
                  {goal.name}
                </h1>
              </header>
              <div className="relative flex flex-wrap items-baseline justify-between gap-x-3">
                <CountUp cents={goal.balanceCents} className="text-5xl leading-none font-bold" />
                <p className="text-hero-muted">
                  van <Money cents={goal.targetCents} className="text-hero-ink" />
                  {goal.targetIsEstimate && <span className="ml-2 text-sm">schatting</span>}
                </p>
              </div>
              <ProgressBar value={goal.isFull ? 1 : goal.balanceCents / goal.targetCents} label={`Voortgang ${goal.name}`} color="var(--color-hero-accent)" className="h-3 bg-hero-track" />
              <div className="relative flex flex-wrap items-center gap-2">
                <p className="font-semibold first-letter:uppercase">{fillText(goal.fill, Math.floor(d.horizon / 12))}</p>
                <StatusBadge status={goal.status} />
              </div>
              {goal.status === "niet_haalbaar" && (
                <div className="relative flex flex-col gap-2 rounded-strip bg-tint p-3 text-ink">
                  <p className="font-semibold">Zo haal je het toch</p>
                  <WayOuts ways={wayOuts(d.projectionInput, goal.id)} savingsCents={d.savingsCents} goalId={goal.id} />
                </div>
              )}
              <dl className="relative flex flex-col gap-1.5 border-t border-hero-line pt-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-hero-muted">Deadline</dt>
                  <dd className="font-semibold">{goal.deadline ? formatMonthNl(goal.deadline) : "Geen"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-hero-muted">Deze maand al opzij</dt>
                  <dd>
                    <Money cents={goal.bookedCents} /> van <Money cents={goal.allocatedCents} />
                  </dd>
                </div>
              </dl>
              <CertaintyMeter onHero level={goal.fillCertainty.level} reason={goal.fillCertainty.reason} className="relative" />
            </section>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild size="lg">
                <Link href={`/storten?pot=${goal.id}`}>Storten</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/storten?pot=${goal.id}&soort=opname`}>Opnemen</Link>
              </Button>
            </div>
            <GoalActions id={goal.id} name={goal.name} balanceCents={goal.balanceCents} isMain={goal.isMain} isEmergency={isEmergency} />
          </div>
          <History
            bookings={(rows ?? []).map((r) => ({ id: r.id, amountCents: r.amount_cents, occurredOn: r.occurred_on, note: r.note, source: r.source }))}
            balanceCents={goal.balanceCents}
          />
        </div>
      </div>
      <BottomNav active="doelen" />
    </>
  );
}
