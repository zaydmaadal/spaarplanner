import Link from "next/link";
import { URGENCY_LABEL, type Urgency } from "@/domain/checklist-rules";

export type Step = { key: string; title: string; urgency: Urgency };

// The first rule items and the open steps the user wrote down; ticking them off happens in Plan.
export function NextSteps({ steps }: { steps: Step[] }) {
  return (
    <section aria-label="Volgende stappen" className="flex flex-col gap-4 rounded-card bg-surface p-5">
      <h2 className="font-display text-xl font-semibold">
        Volgende stappen
      </h2>
      {steps.length === 0 ? (
        <p className="text-ink-2">Je hebt geen open stappen.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {steps.map((s) => (
            <li key={s.key} className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink-2">{URGENCY_LABEL[s.urgency]}</span>
              <span>{s.title}</span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/plan" className="inline-flex h-11 items-center self-start rounded-md px-2 text-sm font-semibold underline underline-offset-4">
        Bekijk je plan
      </Link>
    </section>
  );
}
