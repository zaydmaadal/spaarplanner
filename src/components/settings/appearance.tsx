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
// both values, so two quick changes cannot undo each other.
export function Appearance({ palette: storedPalette, theme: storedTheme }: { palette: Palette; theme: Theme }) {
  const [palette, setPalette] = useState(storedPalette);
  const [theme, setTheme] = useState(storedTheme);

  const save = (prefs: { palette: Palette; theme: Theme }) =>
    saveProfileAction({ prefs }).then(
      (result) => result.ok || toast.error(result.error),
      () => toast.error("Opslaan lukte niet. Probeer het opnieuw."),
    );

  return (
    <div className="flex flex-col gap-5">
      <PalettePicker
        value={palette}
        onChange={(next) => {
          setPalette(next);
          void save({ palette: next, theme });
        }}
      />
      <Choice
        legend="Thema"
        value={theme}
        options={THEMES}
        onChange={(next) => {
          document.documentElement.dataset.theme = next;
          setTheme(next);
          void save({ palette, theme: next });
        }}
      />
    </div>
  );
}
