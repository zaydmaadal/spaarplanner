import { ChevronDown } from "lucide-react";
import { URGENCY_LABEL } from "@/domain/checklist-rules";
import { AddStep } from "./add-step";
import type { checklistGroups } from "./helpers";
import { DismissButton, DoneButton } from "./step-buttons";
import { stepCopy } from "./step-copy";

// Spec 8.6: the steps per urgency. A step is an icon, a short title and one button; the sentence behind it, and the way to
// dismiss a rule step, sit behind "Meer uitleg". Only rule steps and the user's own steps are listed.
export function Checklist({ groups }: { groups: ReturnType<typeof checklistGroups> }) {
  return (
    <section aria-label="Checklist" className="flex flex-col gap-5 rounded-card bg-surface p-5">
      <h2 className="font-display text-xl font-semibold">
        Checklist
      </h2>
      {groups.length === 0 && <p className="text-ink-2">Alles gedaan. Voeg hieronder een stap toe als je iets wil onthouden.</p>}
      {groups.map((g) => (
        <div key={g.urgency} className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-ink-2">{URGENCY_LABEL[g.urgency]}</h3>
          <ul className="flex flex-col divide-y divide-hairline">
            {g.steps.map((s) => {
              const { title, Icon, detail } = stepCopy(s.source === "rule" ? s.key : "", s.title);
              return (
                <li key={`${s.source}:${s.key}`} className="flex flex-col py-3">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint">
                      <Icon className="size-5" />
                    </span>
                    <p className="min-w-0 flex-1 font-semibold break-words">{title}</p>
                    <DoneButton step={s} title={title} />
                  </div>
                  {s.source === "rule" && (
                    <details className="group mt-1 ml-[3.25rem] text-sm">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 font-semibold text-ink-2 [&::-webkit-details-marker]:hidden">
                        Meer uitleg
                        <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="flex flex-col gap-1 pb-1">
                        {detail && <p className="text-ink-2">{detail}</p>}
                        <DismissButton step={s} title={title} />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <AddStep />
    </section>
  );
}
