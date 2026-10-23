import Link from "next/link";
import { stepCopy } from "@/components/plan/step-copy";
import { UrgencyChip } from "@/components/plan/urgency-chip";
import { Button } from "@/components/ui/button";
import type { Urgency } from "@/domain/checklist-rules";
import { stagger } from "@/lib/utils";

export type Step = { key: string; title: string; urgency: Urgency; own?: boolean };

// The first rule items and the open steps the user wrote down: icon, short title, urgency chip, one button to the screen
// where it gets done. The explanation and ticking them off happen in Plan.
export function NextSteps({ steps }: { steps: Step[] }) {
  return (
    <section aria-label="Volgende stappen" className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-card">
      <h2 className="font-display text-xl font-semibold">Volgende stappen</h2>
      {steps.length === 0 ? (
        <p className="text-ink-2">Je hebt geen open stappen.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {steps.map((s, i) => {
            const { title, Icon, action } = stepCopy(s.own ? "" : s.key, s.title);
            return (
              <li key={s.key} className="rise flex items-center gap-2.5 rounded-strip bg-tint p-2" style={stagger(i + 1)}>
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface">
                  <Icon className="size-4.5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <UrgencyChip urgency={s.urgency} />
                  <span className="text-sm font-semibold break-words">{title}</span>
                </div>
                <Button asChild variant="outline">
                  <Link href={action.href} aria-label={`${action.label}: ${title}`}>
                    {action.label}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/plan" className="inline-flex h-11 items-center self-start rounded-md px-2 text-sm font-semibold underline underline-offset-4">
        Bekijk je plan
      </Link>
    </section>
  );
}
