"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { PALETTES, type Palette } from "@/lib/prefs";
import { cn } from "@/lib/utils";

const NAMES: Record<Palette, { name: string; hint: string }> = {
  nachtblauw: { name: "Nachtblauw", hint: "Inktblauw met zacht lichtblauw" },
  zand: { name: "Zand", hint: "Warm beige met terracotta" },
  zonsopgang: { name: "Zonsopgang", hint: "Pruim met abrikoos" },
  smaragd: { name: "Smaragd & goud", hint: "Diepgroen met goud" },
  lagune: { name: "Lagune", hint: "Petrolblauw met aqua" },
  kersen: { name: "Kersen", hint: "Bordeaux met roze" },
};

// Each card sets data-palette itself, so its colours are that palette's own tokens. Persisting the choice is up to the parent.
export function PalettePicker({ value, onChange }: { value: Palette; onChange: (palette: Palette) => void }) {
  const group = useId();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-semibold">Kleurenpalet</legend>
      {PALETTES.map((palette) => (
        <label
          key={palette}
          data-palette={palette}
          className={cn(
            "flex min-h-14 cursor-pointer items-center gap-3 rounded-card border-2 bg-surface p-3 text-ink",
            "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
            value === palette ? "border-ink" : "border-hairline",
          )}
        >
          <input
            type="radio"
            name={group}
            value={palette}
            checked={value === palette}
            onChange={() => {
              document.documentElement.dataset.palette = palette;
              onChange(palette);
            }}
            className="sr-only"
          />
          <span aria-hidden className="flex shrink-0 -space-x-1">
            {["bg-ground", "bg-hero-bg", "bg-action", "bg-spark"].map((swatch) => (
              <span key={swatch} className={cn("size-6 rounded-full border border-ink-2", swatch)} />
            ))}
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{NAMES[palette].name}</span>
            <span className="text-sm text-ink-2">{NAMES[palette].hint}</span>
          </span>
          {value === palette && <Check aria-hidden className="size-5 shrink-0" />}
        </label>
      ))}
    </fieldset>
  );
}
