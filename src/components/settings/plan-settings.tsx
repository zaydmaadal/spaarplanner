"use client";

import { useState } from "react";
import { CheckField, Choice } from "@/components/form-fields";
import { StepShell } from "@/components/onboarding/step-shell";
import { savePlanAction } from "@/data/actions/plan";
import type { PlanSettings } from "@/domain/types";

// Spec 8.7, the rest of "plan": how the plan counts. Each setting is shown where it applies (wisselend inkomen; the fund
// share as soon as there is a pot besides the fund, because the allocation applies it with or without deadlines) and only a
// shown setting is saved, so a hidden one keeps its stored value.
export function PlanSettingsForm({ plan, variableIncome, hasPots }: { plan: PlanSettings; variableIncome: boolean; hasPots: boolean }) {
  const [mode, setMode] = useState(plan.incomeMode);
  const [oneOff, setOneOff] = useState(plan.includeOneOffIncome);
  const [share, setShare] = useState(plan.emergencySharePct === 50 ? "50" : "100");

  async function save() {
    const result = await savePlanAction({
      includeOneOffIncome: oneOff,
      ...(variableIncome ? { incomeMode: mode } : {}),
      ...(hasPots ? { emergencySharePct: Number(share) } : {}),
    });
    return result.ok ? null : result.error;
  }

  return (
    <StepShell mode="edit" step={5} level={2} title="Zo rekenen we" save={save}>
      {variableIncome && (
        <div className="flex flex-col gap-2">
          <Choice
            legend="Wisselend inkomen"
            value={mode}
            onChange={setMode}
            options={[
              { value: "careful", label: "Voorzichtig" },
              { value: "normal", label: "Normaal" },
            ]}
          />
          <p className="text-sm text-ink-2">Voorzichtig rekent met het lage bedrag. Dit telt alleen als je spaarbedrag je spaarruimte volgt.</p>
        </div>
      )}
      <CheckField label="Tel je vakantiegeld en 13de maand mee in je plan?" checked={oneOff} onChange={setOneOff} />
      {hasPots && (
        <div className="flex flex-col gap-2">
          <Choice
            legend="Noodfonds eerst helemaal vullen, of tegelijk met je doelen?"
            value={share}
            onChange={setShare}
            options={[
              { value: "100", label: "Eerst noodfonds" },
              { value: "50", label: "Tegelijk" },
            ]}
          />
          <p className="text-sm text-ink-2">Bij tegelijk gaat de helft van wat je spaart naar je noodfonds en de rest naar je doelen.</p>
        </div>
      )}
    </StepShell>
  );
}
