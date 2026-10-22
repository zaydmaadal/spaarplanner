import { useId } from "react";
import { StatusBadge } from "@/components/overview/labels";
import type { ProjectionInput } from "@/domain/projection";
import { effectOf } from "./effect";

// Spec 5.4: what saving this goal does, before it is saved. `before` and `after` come from previewInputs, so both
// cover the same months.
export function EffectPreview({ before, after }: { before: ProjectionInput; after: ProjectionInput }) {
  const titleId = useId();
  const { subject, shifts } = effectOf(before, after);
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-strip bg-tint p-4">
      <h2 id={titleId} className="font-display text-lg font-semibold">
        Wat dit verandert
      </h2>
      {subject ? (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-ink-2">{subject.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-xl font-semibold">{subject.headline}</p>
              <StatusBadge status={subject.status} />
            </div>
            {subject.advice && <p>{subject.advice}</p>}
          </div>
          {shifts.length > 0 ? (
            <ul className="flex flex-col gap-2 border-t border-hairline pt-3">
              {shifts.map((sentence, i) => (
                <li key={i}>{sentence}</li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-hairline pt-3 text-sm text-ink-2">Je andere potten blijven op hetzelfde moment vol.</p>
          )}
        </>
      ) : (
        <p className="text-ink-2">Je hebt nog niets aangepast.</p>
      )}
    </section>
  );
}
