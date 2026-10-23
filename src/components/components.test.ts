import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BottomNav } from "./bottom-nav";
import { CertaintyMeter } from "./certainty-meter";
import { Money } from "./money";
import { ProgressBar } from "./progress-bar";
import { StackedBar } from "./stacked-bar";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const count = (text: string, part: string) => text.split(part).length - 1;

describe("Money", () => {
  it("formats cents with tabular figures that do not wrap", () => {
    const out = html(h(Money, { cents: 124000 }));
    expect(out).toContain("€ 1.240,00");
    expect(out).toContain("tabular-nums");
    expect(out).toContain("whitespace-nowrap");
  });

  it("writes a negative amount with the true minus sign", () => {
    expect(html(h(Money, { cents: -5000 }))).toContain("− € 50,00");
  });
});

describe("CertaintyMeter", () => {
  it("names the level for assistive tech and fills that many segments", () => {
    const out = html(h(CertaintyMeter, { level: 4, reason: "Uit je loonbrief" }));
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Zekerheid 4 van 5: vrij zeker"');
    expect(count(out, "bg-progress")).toBe(4);
    expect(count(out, "bg-tint")).toBe(1);
    expect(out).toContain("Uit je loonbrief");
  });
});

describe("ProgressBar", () => {
  const now = (value: number) => /aria-valuenow="(\d+)"/.exec(html(h(ProgressBar, { value, label: "Vakantie" })))?.[1];

  it("clamps the value to 0..100 and survives NaN", () => {
    expect([now(0.256), now(1.5), now(-1), now(NaN)]).toEqual(["26", "100", "0", "0"]);
  });

  it("is named by its label and takes a token colour", () => {
    const out = html(h(ProgressBar, { value: 0.5, label: "Vakantie", color: "var(--color-pot-1)" }));
    expect(out).toContain('aria-label="Vakantie"');
    expect(out).toContain("background-color:var(--color-pot-1)");
    expect(out).toContain("width:50%");
  });
});

describe("StackedBar", () => {
  it("sizes segments by cents, lists every segment and skips empty ones in the bar", () => {
    const out = html(
      h(StackedBar, {
        segments: [
          { label: "Vast", cents: 80000, color: "var(--color-seg-fixed)" },
          { label: "Vrij", cents: 0, color: "var(--color-seg-free)" },
          { label: "Sparen", cents: 20000, color: "var(--color-seg-savings)" },
        ],
      }),
    );
    expect(out).toContain("flex-grow:80000");
    expect(out).toContain("flex-grow:20000");
    expect(out).not.toContain("flex-grow:0");
    expect(count(out, "<li")).toBe(3);
    expect(out).toContain("€ 800,00");
  });
});

describe("BottomNav", () => {
  it("marks the active tab and links the middle button to /storten", () => {
    const out = html(h(BottomNav, { active: "doelen" }));
    expect(count(out, 'aria-current="page"')).toBe(1);
    expect(out).toMatch(/<a[^>]*href="\/doelen"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/doelen"/);
    expect(out).toMatch(/<a[^>]*href="\/storten"[^>]*>.*?Storten/);
  });

  it("names the last tab Profiel but keeps its route /meer", () => {
    const out = html(h(BottomNav, { active: "meer" }));
    expect(out).toMatch(/<a[^>]*href="\/meer"[^>]*>.*?Profiel/);
    expect(out).not.toContain(">Meer<");
  });

  it("marks the middle button on the deposit screen, and no tab", () => {
    const out = html(h(BottomNav, { active: "storten" }));
    expect(count(out, 'aria-current="page"')).toBe(1);
    expect(out).toMatch(/<a[^>]*href="\/storten"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/storten"/);
  });
});
