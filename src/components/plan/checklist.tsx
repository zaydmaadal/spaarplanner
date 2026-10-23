import type { ReactNode } from "react";
import { stagger } from "@/lib/utils";
import { AddStep } from "./add-step";
import type { checklistGroups } from "./helpers";
import { DoneButton, StepInfo } from "./step-buttons";
import { stepCopy } from "./step-copy";
import { UrgencyChip } from "./urgency-chip";

// The info icon stays with the last word of the title, so it never wraps onto a line of its own.
function WithInfo({ title, info }: { title: string; info: ReactNode }) {
  const cut = title.lastIndexOf(" ") + 1;
  return (
    <>
      {title.slice(0, cut)}
      <span className="whitespace-nowrap">
        {title.slice(cut)}
        {info}
      </span>
    </>
  );
}

// Spec 8.6: the steps per urgency. A step is an icon, a short title and one button; the sentence behind it, and the way to
// hide a rule step, sit behind its info icon. Only rule steps and the user's own steps are listed.
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
                <li key={`${s.source}:${s.key}`} className="rise rounded-strip bg-tint p-2" style={stagger(++n)}>
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface">
                      <Icon className="size-4.5" />
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-semibold break-words">
                      {s.source === "rule" ? <WithInfo title={title} info={<StepInfo step={s} title={title} detail={detail} />} /> : title}
                    </p>
                    <DoneButton step={s} title={title} />
                  </div>
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
