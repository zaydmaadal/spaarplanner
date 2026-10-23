"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckField, TextareaField } from "@/components/form-fields";
import { InstallGuide } from "@/components/install-guide";
import { PalettePicker } from "@/components/palette-picker";
import { completeOnboardingAction } from "@/data/actions/onboarding";
import { saveProfileAction } from "@/data/actions/profile";
import type { Palette } from "@/lib/prefs";
import { outcome, StepShell, type Mode } from "./step-shell";

export function Step8(props: {
  mode: Mode;
  palette: Palette;
  noInterestSavings: boolean;
  contextNote: string;
  startBalanceCents: number | null;
  emergencyTargetCents: number | null;
  emergencySharePct: number;
}) {
  const { mode } = props;
  const [palette, setPalette] = useState(props.palette);
  const [noInterest, setNoInterest] = useState(props.noInterestSavings);
  const [note, setNote] = useState(props.contextNote);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // The picker already shows the palette on <html>; keep it too, so a reload does not undo the choice.
  function pick(next: Palette) {
    setPalette(next);
    void saveProfileAction({ prefs: { palette: next } }).then((r) => r.ok || toast.error(r.error));
  }

  return (
    <StepShell
      mode={mode}
      step={8}
      title={mode === "edit" ? "Wat de app over je weet" : "Bijna klaar"}
      intro={mode === "edit" ? undefined : "Kies je kleuren en zet de app op je beginscherm."}
      nextLabel="Naar mijn overzicht"
      save={async () =>
        outcome(
          await saveProfileAction({
            prefs: { noInterestSavings: noInterest, contextNote: note },
          }),
          setErrors,
        )
      }
      finish={() =>
        completeOnboardingAction({
          emergencyTargetCents: props.emergencyTargetCents,
          startBalanceCents: props.startBalanceCents ?? 0,
          emergencySharePct: props.emergencySharePct === 50 ? 50 : 100,
        })
      }
    >
      {mode === "onboarding" && <PalettePicker value={palette} onChange={pick} />}
      <CheckField label="Ik wil sparen zonder rente" hint="Dan herinneren we je eraan een spaarpot zonder rente te kiezen bij je bank." checked={noInterest} onChange={setNoInterest} />
      <TextareaField
        label="Wat moet de app nog over jou weten?"
        hint="Bijvoorbeeld vakantiedagen, hobby's of plannen. We gebruiken dit nog niet in berekeningen."
        value={note}
        onChange={setNote}
        error={errors.contextNote}
        maxLength={2000}
      />
      {mode === "onboarding" && <InstallGuide />}
    </StepShell>
  );
}
