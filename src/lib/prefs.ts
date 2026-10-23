export const PALETTES = ["nachtblauw", "zand", "smaragd", "lagune", "kersen", "zonsopgang"] as const;
export const THEMES = ["light", "dark", "system"] as const;
export type Palette = (typeof PALETTES)[number];
export type Theme = (typeof THEMES)[number];

// The palettes of phase 1, until the palettes migration has rewritten them in the database.
const LEGACY: Record<string, Palette> = { oceaan: "lagune", salie: "smaragd", grafiet: "zonsopgang" };

// profiles.prefs is free-form jsonb: take only known values and default per field.
export function parsePrefs(prefs: unknown): { palette: Palette; theme: Theme } {
  const p = typeof prefs === "object" && prefs !== null ? (prefs as Record<string, unknown>) : {};
  return {
    palette: PALETTES.find((x) => x === p.palette) ?? (typeof p.palette === "string" ? LEGACY[p.palette] : undefined) ?? "nachtblauw",
    theme: THEMES.find((x) => x === p.theme) ?? "system",
  };
}

// The look (palette and theme) in a cookie that is not sensitive, so logged-out pages (login, register) show the look of the
// last user on this device instead of the default. Written by ThemeSync and the appearance form, read by the root layout.
export const LOOK_COOKIE = "sp-look";
export const LOOK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const lookCookieValue = ({ palette, theme }: { palette: Palette; theme: Theme }) => `${palette}.${theme}`;
export function parseLookCookie(value: string | undefined): { palette: Palette; theme: Theme } {
  const [palette, theme] = (value ?? "").split(".");
  return parsePrefs({ palette, theme });
}

// The other answers of onboarding step 8, stored under their snake_case keys (see saveProfileAction).
export function parseStep8Prefs(prefs: unknown): { noInterestSavings: boolean; contextNote: string } {
  const p = typeof prefs === "object" && prefs !== null ? (prefs as Record<string, unknown>) : {};
  return {
    noInterestSavings: p.no_interest_savings === true,
    contextNote: typeof p.context_note === "string" ? p.context_note : "",
  };
}
