"use client";

import { useState } from "react";
import { MoneyField } from "@/components/form-fields";
import { saveProfileAction } from "@/data/actions/profile";
import { suggestedEmergencyTarget } from "@/domain/budget";
import { formatEUR, parseEuroInput, toEuroInput } from "@/domain/money";
import type { BudgetLine, Cents } from "@/domain/types";
import { outcome, StepShell, type Mode } from "./step-shell";

const text = (cents: Cents | null) => (cents === null ? "" : toEuroInput(cents));

// Nothing is booked here: the emergency fund is created after step 8, so both answers wait in the profile until then
// (and are removed from it when the onboarding finishes).
export function Step6({ mode, lines, startBalanceCents, emergencyTargetCents }: { mode: Mode; lines: BudgetLine[]; startBalanceCents: Cents | null; emergencyTargetCents: Cents | null }) {
  const [balance, setBalance] = useState(text(startBalanceCents));
  // null: the user has not typed a target, so the field shows the suggestion and the fund counts it as an estimate.
  const [target, setTarget] = useState<string | null>(emergencyTargetCents === null ? null : toEuroInput(emergencyTargetCents));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const expenses = lines.reduce((sum, l) => sum + l.amountCents, 0);
  const suggestion = suggestedEmergencyTarget(expenses);
  const targetCents = target === null ? suggestion : parseEuroInput(target);
  const balanceCents = parseEuroInput(balance);

  return (
    <StepShell
      mode={mode}
      step={6}
      title="Wat heb je al?"
      intro="Een noodfonds is geld voor als er iets onverwachts gebeurt. Heb je al spaargeld, dan wordt dat het startsaldo van je noodfonds."
      save={async () => outcome(await saveProfileAction({ prefs: { startBalance: balance.trim() || null, emergencyTarget: target?.trim() ? target : null } }), setErrors)}
    >
      <MoneyField label="Hoeveel spaargeld heb je nu?" value={balance} onChange={setBalance} error={errors.startBalance} />
      <MoneyField
        label="Doelbedrag voor je noodfonds"
        hint={
          target !== null
            ? undefined
            : expenses > 0
              ? `Voorstel: ${formatEUR(suggestion)}, dat zijn 3 keer je uitgaven per maand. We tellen dit als schatting tot je het zelf aanpast.`
              : `Voorstel: ${formatEUR(suggestion)}, want je hebt nog geen uitgaven ingevuld. We tellen dit als schatting tot je het zelf aanpast.`
        }
        value={target ?? toEuroInput(suggestion)}
        onChange={setTarget}
        error={errors.emergencyTarget}
      />
      {balanceCents !== null && targetCents !== null && balanceCents > targetCents && (
        <p className="text-sm text-ink-2">Wat boven het doelbedrag uitkomt, zetten we op je hoofddoel. Dat is het eerste doel dat je in de volgende stap kiest, en alleen tot dat doel vol is.</p>
      )}
    </StepShell>
  );
}
