"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Choice } from "@/components/form-fields";
import { PalettePicker } from "@/components/palette-picker";
import { saveProfileAction } from "@/data/actions/profile";
import type { Palette, Theme } from "@/lib/prefs";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Licht" },
  { value: "dark", label: "Donker" },
  { value: "system", label: "Systeem" },
];

// Spec 8.7: palette and theme. The choice shows on <html> at once (the picker sets data-palette itself) and is saved with
// both values, so two quick changes cannot undo each other. When the save fails, the page goes back to what it was.
export function Appearance({ palette: storedPalette, theme: storedTheme }: { palette: Palette; theme: Theme }) {
  const [palette, setPalette] = useState(storedPalette);
  const [theme, setTheme] = useState(storedTheme);
  const html = () => document.documentElement.dataset;

  async function save(prefs: { palette: Palette; theme: Theme }, undo: () => void) {
    const result = await saveProfileAction({ prefs }).catch(() => null); // a dropped connection throws
    if (result?.ok) return;
    undo();
    toast.error(result ? result.error : "Opslaan lukte niet. Probeer het opnieuw.");
  }

  return (
    <div className="flex flex-col gap-5">
      <PalettePicker
        value={palette}
        onChange={(next) => {
          const before = palette;
          setPalette(next);
          void save({ palette: next, theme }, () => {
            html().palette = before;
            setPalette(before);
          });
        }}
      />
      <Choice
        legend="Thema"
        value={theme}
        options={THEMES}
        onChange={(next) => {
          const before = theme;
          html().theme = next;
          setTheme(next);
          void save({ palette, theme: next }, () => {
            html().theme = before;
            setTheme(before);
          });
        }}
      />
    </div>
  );
}
