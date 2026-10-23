import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the real tokens: every palette block lists all tokens (no palette leans on another one).
// A token is `#hex`, `var(--color-x)` or `light-dark(<light>, <dark>)` of those two.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim(),
  vars: Object.fromEntries([...body.matchAll(/--color-([\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()])),
}));
const PALETTES = ["nachtblauw", "zand", "smaragd", "lagune", "kersen", "zonsopgang"] as const;
const MODES = ["light", "dark"] as const;
type Mode = (typeof MODES)[number];

const tokensOf = (palette: string): Record<string, string> =>
  blocks.find((b) => b.selector.includes(`[data-palette="${palette}"]`))?.vars ?? {};

function color(tokens: Record<string, string>, name: string, mode: Mode): string {
  const raw = tokens[name];
  if (!raw) throw new Error(`token --color-${name} is missing`);
  const [light, dark] = raw.startsWith("light-dark(") ? raw.slice(11, -1).split(",").map((s) => s.trim()) : [raw, raw];
  const value = mode === "light" ? light : dark;
  const ref = /^var\(--color-([\w-]+)\)$/.exec(value);
  if (ref) return color(tokens, ref[1], mode);
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`token --color-${name} is not a #rrggbb colour in ${mode}: ${value}`);
  return value;
}

// WCAG 2.x relative luminance and contrast ratio.
const channel = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum ratio, modes]
const PAIRS: [string, string, number, readonly Mode[]][] = [
  ["ink", "ground", 4.5, MODES],
  ["ink", "surface", 4.5, MODES],
  ["ink-2", "ground", 4.5, MODES],
  ["ink-2", "surface", 4.5, MODES],
  ["ink-2", "tint", 4.5, MODES],
  ["ink", "tint-accent", 4.5, MODES],
  ["muted", "surface", 4.5, ["dark"]],
  ["muted", "tint", 4.5, ["dark"]],
  ["on-action", "action", 4.5, MODES],
  ["active-ink", "active-bg", 4.5, MODES],
  ["accent-ink", "tint-accent", 4.5, ["light"]],
  ["warn-ink", "warn-bg", 4.5, MODES],
  ["error", "surface", 4.5, MODES],
  ["error", "ground", 4.5, MODES],
  ["progress", "surface", 3, MODES],
  // The dark hero card is the same in light and dark: its text, its muted text, and the highlight colour on it and under text.
  ["hero-ink", "hero-bg", 4.5, MODES],
  ["hero-muted", "hero-bg", 4.5, MODES],
  ["spark", "hero-bg", 3, MODES],
  ["hero-accent", "hero-bg", 3, MODES],
  ["on-spark", "spark", 4.5, MODES],
  // Bars must stay visible on a dark card; in light the pastel segments are fixed by the design and always carry a text label.
  ...["pot-1", "pot-2", "pot-3", "pot-4", "pot-5", "seg-fixed", "seg-living", "seg-savings", "seg-free"].map(
    (t): [string, string, number, readonly Mode[]] => [t, "surface", 3, ["dark"]],
  ),
];

describe.each(PALETTES)("palette %s", (palette) => {
  const tokens = tokensOf(palette);
  for (const [fg, bg, min, modes] of PAIRS) {
    it.each(modes)(`${fg} on ${bg} is at least ${min}:1 (%s)`, (mode) => {
      const r = ratio(color(tokens, fg, mode), color(tokens, bg, mode));
      expect(r, `${fg} ${color(tokens, fg, mode)} on ${bg} ${color(tokens, bg, mode)} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(min);
    });
  }
});

// Hue in degrees (0 to 360) of a #rrggbb colour.
function hue(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe("palette tokens", () => {
  const reference = Object.keys(tokensOf("nachtblauw")).sort();
  it("nachtblauw is the default on :root", () => {
    expect(blocks.some((b) => b.selector.includes(":root") && b.selector.includes('[data-palette="nachtblauw"]'))).toBe(true);
  });
  it.each(PALETTES)("%s defines every token", (palette) => {
    expect(reference.length).toBeGreaterThan(30);
    expect(Object.keys(tokensOf(palette)).sort()).toEqual(reference);
  });
  describe.each(PALETTES)("%s", (palette) => {
    it.each(MODES)("pot 1 to 3 are three clearly different hues (%s)", (mode) => {
      const hues = [1, 2, 3].map((n) => hue(color(tokensOf(palette), `pot-${n}`, mode)));
      for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) {
        const gap = Math.abs(hues[a] - hues[b]);
        expect(Math.min(gap, 360 - gap), `pot-${a + 1} ${hues[a].toFixed(0)} and pot-${b + 1} ${hues[b].toFixed(0)}`).toBeGreaterThanOrEqual(40);
      }
    });
  });
});
