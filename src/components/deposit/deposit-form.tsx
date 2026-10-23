"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Choice, MoneyField } from "@/components/form-fields";
import { Money } from "@/components/money";
import { ProgressBar, type TokenColor } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { addTransactionsAction } from "@/data/actions/transactions";
import { formatEUR, parseEuroInput, toEuroInput } from "@/domain/money";
import type { Cents, ISODate } from "@/domain/types";
import { stagger } from "@/lib/utils";
import { depositItems, totalCents } from "./items";

export type Pot = { id: string; name: string; balanceCents: Cents; targetCents: Cents; color: TokenColor; prefillCents: Cents };
type Direction = "in" | "out";
type Done = { direction: Direction; totalCents: Cents; pots: { id: string; name: string; color: TokenColor; targetCents: Cents; afterCents: Cents }[] };

const SUCCESS_MS = 1800; // how long the success state shows before the screen moves on

// "In de pot: € 100,00", and once an amount is typed, what the pot holds after it ("Na storten: € 150,00").
function potHint(pot: Pot, direction: Direction, cents: Cents | null): string {
  const now = `In de pot: ${formatEUR(pot.balanceCents)}`;
  if (!cents) return now;
  return direction === "in" ? `${now} · Na storten: ${formatEUR(pot.balanceCents + cents)}` : `${now} · Na opnemen: ${formatEUR(Math.max(0, pot.balanceCents - cents))}`;
}

const after = (pot: Pot, direction: Direction, cents: Cents | null) => Math.max(0, pot.balanceCents + (direction === "in" ? 1 : -1) * (cents ?? 0));
const fraction = (cents: Cents, target: Cents) => (target > 0 ? cents / target : 1);

// The state that holds the success view lives here, above the keyed form: the save refreshes the page, which gives the form
// another key (the prefill is paid), and a form state would be lost with it. The view resets when the page is hidden again.
export function DepositScreen({ pots, today, initial, only }: { pots: Pot[]; today: ISODate; initial: Direction; only?: string }) {
  const router = useRouter();
  const [done, setDone] = useState<Done | null>(null);
  const to = only ? `/doelen/${only}` : "/overzicht";

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => router.push(to), SUCCESS_MS);
    return () => {
      clearTimeout(timer);
      setDone(null);
    };
  }, [done, router, to]);

  if (done) return <Success done={done} to={to} only={only !== undefined} />;
  // The key starts a fresh form when the page is shown for another pot, direction or period amount.
  return <DepositForm key={`${only}-${initial}-${pots.map((p) => p.prefillCents).join("-")}`} pots={pots} today={today} initial={initial} onDone={setDone} />;
}

// A check that draws itself, the total, and what every pot holds now, each with a bar that fills.
function Success({ done, to, only }: { done: Done; to: string; only: boolean }) {
  return (
    <div role="status" className="rise relative flex flex-col gap-4 overflow-hidden rounded-hero bg-hero-bg p-5 text-hero-ink lg:p-8">
      <div aria-hidden className="contour pointer-events-none absolute -top-10 -right-10 size-72" />
      <div className="relative flex flex-col items-center gap-2 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-spark text-on-spark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-9" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className="draw" />
          </svg>
        </span>
        <p className="font-display text-2xl font-bold">{done.direction === "in" ? "Gestort" : "Opname opgeslagen"}</p>
        <Money cents={done.totalCents} className="font-display text-5xl leading-none font-bold text-hero-accent" />
      </div>
      <ul className="relative flex flex-col gap-2">
        {done.pots.map((p, i) => (
          <li key={p.id} className="rise flex flex-col gap-1.5 rounded-strip border border-hero-line bg-hero-tile p-3" style={stagger(i + 2)}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{p.name}</span>
              <span className="text-sm text-hero-muted">
                Nu in de pot: <Money cents={p.afterCents} className="text-base text-hero-ink" />
              </span>
            </div>
            <ProgressBar value={fraction(p.afterCents, p.targetCents)} label={`Stand van ${p.name}`} color={p.color} className="h-2 bg-hero-track" />
          </li>
        ))}
      </ul>
      <Button asChild size="lg" className="relative bg-spark text-on-spark hover:bg-spark/90">
        <Link href={to}>{only ? "Terug naar de pot" : "Naar je overzicht"}</Link>
      </Button>
    </div>
  );
}

// Spec 8.5: every pot with what is still to be put aside this period, one tap on "Opslaan" books all of it. A loose
// deposit or a withdrawal is the same form with other amounts.
function DepositForm({ pots, today, initial, onDone }: { pots: Pot[]; today: ISODate; initial: Direction; onDone: (done: Done) => void }) {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>(initial);
  // A deposit starts from what is still to be put aside; a withdrawal never starts filled.
  const start = (to: Direction) => Object.fromEntries(pots.map((p) => [p.id, to === "in" && p.prefillCents > 0 ? toEuroInput(p.prefillCents) : ""]));
  const [amounts, setAmounts] = useState(() => start(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // One reference per row, made when it is first sent and kept until the save succeeds: a double tap, or a retry after
  // a bad connection, sends the same reference and the database books it once. A withdrawal is another booking than
  // a deposit, so the direction is part of the key.
  const refs = useRef<Record<string, string>>({});
  const rows = pots.map((p) => ({ goalId: p.id, text: amounts[p.id] ?? "" }));

  // An app left open over midnight or a payday has an old `today` and period: ask for fresh props when it comes back.
  // The page keys this form on the prefill, so a new period starts it again and typed amounts survive an unchanged one.
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [router]);

  function switchTo(next: Direction) {
    setDirection(next);
    setAmounts(start(next));
    setErrors({});
    setError(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const { items, errors: invalid } = depositItems(rows, direction, today, (goalId) => (refs.current[`${direction}:${goalId}`] ??= crypto.randomUUID()));
    setErrors(invalid);
    setError(null);
    if (Object.keys(invalid).length > 0) return;
    if (items.length === 0) return setError("Vul bij minstens één pot een bedrag in.");
    // What the success view shows, worked out before the save refreshes the page.
    const summary: Done = {
      direction,
      totalCents: totalCents(rows),
      pots: pots.flatMap((p) => (items.some((i) => i.goalId === p.id) ? [{ id: p.id, name: p.name, color: p.color, targetCents: p.targetCents, afterCents: after(p, direction, parseEuroInput(amounts[p.id] ?? "")) }] : [])),
    };
    startTransition(async () => {
      // A dropped connection throws; catching it keeps this form and its refs, so a retry books once.
      const result = await addTransactionsAction(items).catch(() => null);
      if (!result) return setError("Opslaan lukte niet. Probeer het opnieuw.");
      if (!result.ok) return setError(result.error);
      refs.current = {};
      setAmounts(start("out")); // empty: what was put aside is not to be put aside again
      toast.success(direction === "in" ? "Gestort." : "Opname opgeslagen.");
      onDone(summary);
    });
  }

  const total = totalCents(rows);
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-card">
          <Choice
            legend="Wat wil je doen?"
            value={direction}
            onChange={switchTo}
            options={[
              { value: "in", label: "Storten" },
              { value: "out", label: "Opnemen" },
            ]}
          />
          <p className="text-sm text-ink-2">
            {direction === "in" ? "Hoeveel zette je opzij? Dit is wat je deze periode nog moet storten." : "Hoeveel haal je weg? Je kan niet meer opnemen dan er in de pot zit."}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {pots.map((p, i) => {
            const cents = parseEuroInput(amounts[p.id] ?? "");
            return (
              <div key={p.id} className="rise flex flex-col gap-2 rounded-card bg-surface p-3 shadow-card" style={stagger(i + 1)}>
                <MoneyField
                  label={p.name}
                  hint={potHint(p, direction, cents)}
                  value={amounts[p.id] ?? ""}
                  onChange={(text) => setAmounts((all) => ({ ...all, [p.id]: text }))}
                  error={errors[p.id]}
                />
                {/* The bar follows what is typed: where the pot ends up. */}
                <ProgressBar value={fraction(after(p, direction, cents), p.targetCents)} label={`Stand van ${p.name} na ${direction === "in" ? "storten" : "opnemen"}`} color={p.color} className="h-2" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3 lg:sticky lg:top-10">
        <div className="rise flex flex-col gap-1 rounded-hero bg-hero-bg p-4 text-hero-ink lg:p-5" style={stagger(2)}>
          <span className="text-xs font-semibold tracking-widest text-hero-muted uppercase">{direction === "in" ? "Totaal van deze storting" : "Totaal van deze opname"}</span>
          <Money cents={total} className="font-display text-5xl leading-none font-bold" />
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          Opslaan
        </Button>
      </div>
    </form>
  );
}
