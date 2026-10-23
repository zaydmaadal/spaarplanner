export const PALETTES = ["oceaan", "salie", "grafiet"] as const;
export const THEMES = ["light", "dark", "system"] as const;
export type Palette = (typeof PALETTES)[number];
export type Theme = (typeof THEMES)[number];

// profiles.prefs is free-form jsonb: take only known values and default per field.
export function parsePrefs(prefs: unknown): { palette: Palette; theme: Theme } {
  const p = typeof prefs === "object" && prefs !== null ? (prefs as Record<string, unknown>) : {};
  return {
    palette: PALETTES.find((x) => x === p.palette) ?? "oceaan",
    theme: THEMES.find((x) => x === p.theme) ?? "system",
  };
}

// The other answers of onboarding step 8, stored under their snake_case keys (see saveProfileAction).
export function parseStep8Prefs(prefs: unknown): { noInterestSavings: boolean; contextNote: string } {
  const p = typeof prefs === "object" && prefs !== null ? (prefs as Record<string, unknown>) : {};
  return {
    noInterestSavings: p.no_interest_savings === true,
    contextNote: typeof p.context_note === "string" ? p.context_note : "",
  };
}
