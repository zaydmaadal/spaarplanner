"use client";

import { Info } from "lucide-react";
import { Popover } from "radix-ui";
import { CERTAINTY_LABEL, type Level } from "@/domain/certainty";

// "zeker", "vrij zeker", ...; a figure that is only an estimate (level 2 or below) gets an info button that says why.
// `reason` is the text of the calculation: "Schatting: inkomen, uitgaven" or "Op basis van jouw invoer".
export function CertaintyLabel({ level, reason }: { level: Level; reason: string }) {
  const label = CERTAINTY_LABEL[level];
  if (level > 2) return <>{label}</>;
  const why = reason.startsWith("Schatting: ") ? `omdat dit nog een schatting is: ${reason.slice("Schatting: ".length)}` : "omdat een deel van je invoer een schatting is";
  return (
    <span className="inline-flex items-center gap-0.5">
      {label}
      <Popover.Root>
        <Popover.Trigger
          aria-label={`Waarom is dit een ${label}?`}
          className="relative z-10 -my-3 inline-flex size-11 items-center justify-center rounded-full text-current opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-ink"
        >
          <Info aria-hidden className="size-4" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content sideOffset={4} collisionPadding={16} className="z-50 max-w-72 rounded-strip border border-hairline bg-surface p-3 text-sm font-normal text-ink shadow-lg">
            Schatting: dit bedrag is een inschatting {why}. Pas het aan in Meer.
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}
