"use client";

import { useState } from "react";
import { TextField } from "@/components/form-fields";
import { saveProfileAction } from "@/data/actions/profile";
import { outcome, StepShell, type Mode } from "./step-shell";

export function Step1({ mode, displayName }: { mode: Mode; displayName: string }) {
  const [name, setName] = useState(displayName);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <StepShell
      mode={mode}
      step={1}
      title={mode === "edit" ? "Je naam" : "Welkom bij Spaarplanner"}
      intro={mode === "edit" ? undefined : "Spaarplanner laat zien wat je per maand kan sparen en wanneer je doelen klaar zijn. Dit duurt een paar minuten en je mag elke stap overslaan."}
      save={async () => outcome(await saveProfileAction({ displayName: name }), setErrors)}
    >
      <TextField label={mode === "edit" ? "Voornaam of bijnaam" : "Je naam"} hint="Zo spreken we je aan in de app." value={name} onChange={setName} error={errors.displayName} autoComplete="given-name" maxLength={80} />
    </StepShell>
  );
}
