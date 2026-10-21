import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the real tokens: oceaan is the complete block, salie and grafiet override what differs.
// A token is `#hex`, `var(--color-x)` or `light-dark(<light>, <dark>)` of those two.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim(),
  vars: Object.fromEntries([...body.matchAll(/--color-([\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()])),
}));
const PALETTES = ["oceaan", "salie", "grafiet"] as const;
const MODES = ["light", "dark"] as const;
type Mode = (typeof MODES)[number];

const varsOf = (palette: string) => blocks.find((b) => b.selector.includes(`[data-palette="${palette}"]`))?.vars;
const tokensOf = (palette: string): Record<string, string> => ({ ...varsOf("oceaan"), ...varsOf(palette) });

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
  // Bars must stay visible on a dark card; in light the pastel segments are fixed by the design and always carry a text label.
  ...["pot-1", "pot-2", "pot-3", "pot-4", "seg-fixed", "seg-living", "seg-savings", "seg-free"].map(
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
