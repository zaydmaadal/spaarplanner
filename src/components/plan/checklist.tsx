import { useId } from "react";
import { URGENCY_LABEL } from "@/domain/checklist-rules";
import { AddStep } from "./add-step";
import type { checklistGroups } from "./helpers";
import { StepButtons } from "./step-buttons";

// Spec 8.6: the steps per urgency, to tick off or dismiss, and a step of your own.
export function Checklist({ groups }: { groups: ReturnType<typeof checklistGroups> }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-5 rounded-card bg-surface p-5">
      <h2 id={titleId} className="font-display text-xl font-semibold">
        Checklist
      </h2>
      {groups.length === 0 && <p className="text-ink-2">Je hebt geen open stappen.</p>}
      {groups.map((g) => (
        <div key={g.urgency} className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-ink-2">{URGENCY_LABEL[g.urgency]}</h3>
          <ul className="flex flex-col divide-y divide-hairline">
            {g.steps.map((s) => (
              <li key={`${s.source}:${s.key}`} className="flex items-center gap-2 py-1">
                <span className="min-w-0 flex-1 py-2 break-words">{s.title}</span>
                <StepButtons step={s} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <AddStep />
    </section>
  );
}
