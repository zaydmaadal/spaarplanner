import { ChevronDown } from "lucide-react";
import { stagger } from "@/lib/utils";
import { AddStep } from "./add-step";
import type { checklistGroups } from "./helpers";
import { DismissButton, DoneButton } from "./step-buttons";
import { stepCopy } from "./step-copy";
import { UrgencyChip } from "./urgency-chip";

// Spec 8.6: the steps per urgency. A step is an icon, a short title and one button; the sentence behind it, and the way to
// dismiss a rule step, sit behind "Meer uitleg". Only rule steps and the user's own steps are listed.
export function Checklist({ groups }: { groups: ReturnType<typeof checklistGroups> }) {
  let n = 0;
  return (
    <section aria-label="Checklist" className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
      <h2 className="font-display text-xl font-semibold">Checklist</h2>
      {groups.length === 0 && <p className="text-ink-2">Alles gedaan. Voeg hieronder een stap toe als je iets wil onthouden.</p>}
      {groups.map((g) => (
        <div key={g.urgency} className="flex flex-col items-start gap-1.5">
          <UrgencyChip as="h3" urgency={g.urgency} />
          <ul className="flex w-full flex-col gap-1.5">
            {g.steps.map((s) => {
              const { title, Icon, detail } = stepCopy(s.source === "rule" ? s.key : "", s.title);
              return (
                <li key={`${s.source}:${s.key}`} className="rise flex flex-col rounded-strip bg-tint p-2" style={stagger(++n)}>
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface">
                      <Icon className="size-4.5" />
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-semibold break-words">{title}</p>
                    <DoneButton step={s} title={title} />
                  </div>
                  {s.source === "rule" && (
                    <details className="group ml-[2.875rem] text-sm">
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
