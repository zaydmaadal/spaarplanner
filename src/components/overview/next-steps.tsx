import Link from "next/link";
import { useId } from "react";

export type Step = { key: string; title: string; urgency: string };

const URGENCY: Record<string, string> = { week: "Deze week", month: "Deze maand", later: "Later" };

// The first rule items and the open steps the user wrote down; ticking them off happens in Plan.
export function NextSteps({ steps }: { steps: Step[] }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-card bg-surface p-5">
      <h2 id={titleId} className="font-display text-xl font-semibold">
        Volgende stappen
      </h2>
      {steps.length === 0 ? (
        <p className="text-ink-2">Je hebt geen open stappen.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {steps.map((s) => (
            <li key={s.key} className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink-2">{URGENCY[s.urgency] ?? URGENCY.later}</span>
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
