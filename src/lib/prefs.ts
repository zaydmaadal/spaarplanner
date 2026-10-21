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
