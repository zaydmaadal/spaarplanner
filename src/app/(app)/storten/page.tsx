import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { DepositForm } from "@/components/deposit/deposit-form";
import { loadScreenData } from "@/data/load";
import { buildDashboard } from "@/domain/dashboard";

export const metadata: Metadata = { title: "Storten" };

// Spec 8.5. All pots by default; ?pot=<id> is one pot (from its screen) and ?soort=opname starts on a withdrawal.
export default async function DepositPage({ searchParams }: PageProps<"/storten">) {
  const { pot, soort } = await searchParams;
  const { today, data } = await loadScreenData();
  const d = buildDashboard(data, today);
  const only = d.goals.find((g) => g.id === pot);
  const pots = (only ? [only] : d.goals).map((g) => ({ id: g.id, name: g.name, balanceCents: g.balanceCents, prefillCents: d.depositPrefill[g.id] ?? 0 }));
  const initial = soort === "opname" ? "out" : "in";
  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Storten</h1>
        {/* The key starts a fresh form when the page is shown for another pot, direction or period amount. */}
        <DepositForm key={`${only?.id}-${initial}-${pots.map((p) => p.prefillCents).join("-")}`} pots={pots} today={today} initial={initial} only={only?.id} />
      </div>
      <BottomNav active="storten" />
    </>
  );
}
