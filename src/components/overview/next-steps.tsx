import Link from "next/link";
import { stepCopy } from "@/components/plan/step-copy";
import { Button } from "@/components/ui/button";
import { URGENCY_LABEL, type Urgency } from "@/domain/checklist-rules";

export type Step = { key: string; title: string; urgency: Urgency; own?: boolean };

// The first rule items and the open steps the user wrote down: icon, short title, one button to the screen where it gets
// done. The explanation and ticking them off happen in Plan.
export function NextSteps({ steps }: { steps: Step[] }) {
  return (
    <section aria-label="Volgende stappen" className="flex flex-col gap-3 rounded-card bg-surface p-5">
      <h2 className="font-display text-xl font-semibold">
        Volgende stappen
      </h2>
      {steps.length === 0 ? (
        <p className="text-ink-2">Je hebt geen open stappen.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {steps.map((s) => {
            const { title, Icon, action } = stepCopy(s.own ? "" : s.key, s.title);
            return (
              <li key={s.key} className="flex items-center gap-3 py-3">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint">
                  <Icon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold text-ink-2">{URGENCY_LABEL[s.urgency]}</span>
                  <span className="font-semibold break-words">{title}</span>
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
