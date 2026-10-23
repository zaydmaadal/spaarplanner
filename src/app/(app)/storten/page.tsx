import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { BottomNav } from "@/components/bottom-nav";
import { DepositScreen } from "@/components/deposit/deposit-form";
import { potColor } from "@/components/overview/labels";
import { Button } from "@/components/ui/button";
import { loadScreenData } from "@/data/load";
import { buildDashboard } from "@/domain/dashboard";

export const metadata: Metadata = { title: "Storten" };

// Spec 8.5. All pots by default; ?pot=<id> is one pot (from its screen) and ?soort=opname starts on a withdrawal.
export default async function DepositPage({ searchParams }: PageProps<"/storten">) {
  const { pot, soort } = await searchParams;
  const { today, data } = await loadScreenData();
  const d = buildDashboard(data, today);
  const only = d.goals.find((g) => g.id === pot);
  const pots = (only ? [only] : d.goals).map((g) => ({ id: g.id, name: g.name, balanceCents: g.balanceCents, targetCents: g.targetCents, color: potColor(g), prefillCents: d.depositPrefill[g.id] ?? 0 }));
  const initial = soort === "opname" ? "out" : "in";
  return (
    <>
      <div className="flex flex-col gap-4 lg:gap-6">
        <BackLink href={only ? `/doelen/${only.id}` : "/overzicht"} parent={only ? only.name : "je overzicht"} />
        <h1 className="font-display text-3xl font-bold">Storten</h1>
        {pots.length === 0 ? (
          <>
            <p className="text-ink-2">Je hebt nog geen doelen om op te storten.</p>
            <Button asChild className="self-start">
              <Link href="/doelen/nieuw">Maak je eerste doel</Link>
            </Button>
          </>
        ) : (
          <DepositScreen pots={pots} today={today} initial={initial} only={only?.id} />
        )}
      </div>
      <BottomNav active="storten" />
    </>
  );
}
