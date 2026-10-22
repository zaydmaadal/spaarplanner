"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Choice, MoneyField } from "@/components/form-fields";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { addTransactionsAction } from "@/data/actions/transactions";
import { formatEUR, toEuroInput } from "@/domain/money";
import type { Cents, ISODate } from "@/domain/types";
import { depositItems, totalCents } from "./items";

export type Pot = { id: string; name: string; balanceCents: Cents; prefillCents: Cents };
type Direction = "in" | "out";

// Spec 8.5: every pot with what is still to be put aside this period, one tap on "Opslaan" books all of it. A loose
// deposit or a withdrawal is the same form with other amounts. `only` is set when the form is for one pot.
export function DepositForm({ pots, today, initial, only }: { pots: Pot[]; today: ISODate; initial: Direction; only?: string }) {
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
    startTransition(async () => {
      // A dropped connection throws; catching it keeps this form and its refs, so a retry books once.
      const result = await addTransactionsAction(items).catch(() => null);
      if (!result) return setError("Opslaan lukte niet. Probeer het opnieuw.");
      if (!result.ok) return setError(result.error);
      refs.current = {};
      setAmounts(start("out")); // empty: what was put aside is not to be put aside again
      toast.success(direction === "in" ? "Gestort." : "Opname opgeslagen.");
      router.push(only ? `/doelen/${only}` : "/overzicht");
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-card bg-surface p-5">
        <Choice
          legend="Wat wil je doen?"
          value={direction}
          onChange={switchTo}
          options={[
            { value: "in", label: "Storten" },
            { value: "out", label: "Opnemen" },
          ]}
        />
        <p className="text-ink-2">
          {direction === "in" ? "Hoeveel zette je opzij? Dit is wat je deze periode nog moet storten." : "Hoeveel haal je weg? Je kan niet meer opnemen dan er in de pot zit."}
        </p>
        {pots.map((p) => (
          <MoneyField
            key={p.id}
            label={p.name}
            hint={`In de pot: ${formatEUR(p.balanceCents)}`}
            value={amounts[p.id] ?? ""}
            onChange={(text) => setAmounts((all) => ({ ...all, [p.id]: text }))}
            error={errors[p.id]}
          />
        ))}
        <div className="flex items-center justify-between gap-3 border-t pt-3 font-semibold">
          <span>Totaal</span>
          <Money cents={totalCents(rows)} />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        Opslaan
      </Button>
    </form>
  );
}
