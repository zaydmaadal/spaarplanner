import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { buildDashboard, type UserData } from "@/domain/dashboard";
import { haider, student, tiener, zayd } from "@/domain/fixtures/personas";
import { fillText } from "./labels";
import { MainGoalCard } from "./main-goal-card";
import { NextSteps } from "./next-steps";
import { PaydayStrip } from "./payday-strip";
import { PotsList } from "./pots-list";
import { SalarySplit } from "./salary-split";
import { Simulator } from "./simulator";

// The simulator imports a server action, which imports server-only.
vi.mock("@/data/actions/plan", () => ({ savePlanAction: vi.fn() }));

const today = "2026-10-20";
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el).replace(/<!-- -->/g, "");
const dash = (data: UserData) => buildDashboard(data, today);
const years = (data: UserData) => Math.floor(dash(data).horizon / 12);
const goalCard = (data: UserData) => {
  const d = dash(data);
  return html(h(MainGoalCard, { goal: d.mainGoal!, waitsFor: d.mainGoalWaitsFor, horizonYears: years(data) }));
};

describe("fillText (spec 8.3)", () => {
  test("a month, already full, and not within the horizon", () => {
    expect(fillText({ year: 2027, month: 5 }, 10)).toBe("vol rond mei 2027");
    expect(fillText("full", 10)).toBe("vol");
    expect(fillText(null, 10)).toBe("niet binnen 10 jaar");
  });
});

describe("MainGoalCard", () => {
  test("a main goal that gets nothing yet says why", () => {
    expect(goalCard(zayd)).toContain("Krijgt nu nog niets: eerst je noodfonds, vol rond dec 2026.");
    expect(goalCard(zayd)).toContain("Hijra");
  });

  test("the emergency fund is the main goal when no other goal is, and an estimate says so", () => {
    const out = goalCard({ ...haider, incomes: [], goals: [haider.goals[0]] });
    expect(out).toContain("Noodfonds");
    expect(out).toContain("€\u00a01.000,00");
    expect(out).toContain("schatting");
    expect(out).not.toContain("Krijgt nu nog niets");
  });
});

describe("SalarySplit", () => {
  const split = (data: UserData) => {
    const d = dash(data);
    return html(h(SalarySplit, { lines: data.lines, budget: d.budget, savingsCents: d.savingsCents, savingsCertainty: d.savingsCertainty, warnings: d.warnings }));
  };

  test("lists what the income goes to and ends with the total", () => {
    const out = split(zayd);
    for (const part of ["Vaste kosten", "Vrije tijd", "Sparen", "Netto per maand", "€\u00a02.200,00"]) expect(out).toContain(part);
    expect(out).not.toContain("Leven"); // nothing in that group
    expect(out.lastIndexOf("Netto per maand")).toBeGreaterThan(out.indexOf("Sparen"));
  });

  test("what is not spent or saved shows as left over", () => {
    expect(split(haider)).toContain("Over"); // 2.150 income, 430 saved
  });

  test("savings above the room have no Over row and say so in the warning", () => {
    const out = split({ ...haider, plan: { ...haider.plan, monthlySavingsCents: 300000 } }); // 2.150 income
    expect(out).not.toContain("Over<");
    expect(out).toContain("Je wil €\u00a03.000,00 sparen maar houdt €\u00a02.150,00 over.");
  });

  test("without income or costs it asks for the income instead of an empty bar", () => {
    const out = split({ ...haider, incomes: [] });
    expect(out).toContain("Inkomen invullen");
    expect(out).not.toContain("Netto per maand");
  });
});

describe("PotsList", () => {
  test("every pot shows its month and how sure that is", () => {
    const out = html(h(PotsList, { goals: dash(haider).goals, horizonYears: years(haider) }));
    expect(out).toMatch(/vol rond nov 2026 · <span[^>]*>schatting/);
    expect(out).toMatch(/vol rond mei 2027 · <span[^>]*>schatting/);
    expect(out).toContain("Waarom is dit een schatting?"); // the info button that explains the estimate
    expect(out).toContain("€\u00a02.500,00");
  });

  test("a pot that never fills says how far the projection looked", () => {
    expect(html(h(PotsList, { goals: dash(tiener).goals, horizonYears: years(tiener) }))).toContain("niet binnen 10 jaar");
  });

  test("no pots asks for the first goal", () => {
    expect(html(h(PotsList, { goals: [], horizonYears: 10 }))).toContain("Maak je eerste doel");
  });
});

describe("PaydayStrip and NextSteps", () => {
  test("the strip names the day and counts down", () => {
    const out = html(h(PaydayStrip, { nextPayday: "2026-10-29", daysToPayday: 9, progress: 0.5 }));
    expect(out).toContain("Volgende loondag");
    expect(out).toContain("donderdag 29 oktober");
    expect(out).toContain("Nog 9 dagen");
    expect(html(h(PaydayStrip, { nextPayday: "2026-10-21", daysToPayday: 1, progress: 0.9 }))).toContain("Morgen");
  });

  test("steps carry their urgency in words", () => {
    const out = html(h(NextSteps, { steps: [{ key: "a", title: "Zet €\u00a0430,00 opzij", urgency: "week" }, { key: "b", title: "Stage vinden", urgency: "later" }] }));
    expect(out).toContain("Deze week");
    expect(out).toContain("Stage vinden");
    expect(html(h(NextSteps, { steps: [] }))).toContain("Je hebt geen open stappen.");
  });
});

describe("Simulator", () => {
  const sim = (data: UserData) => {
    const d = dash(data);
    return html(h(Simulator, { base: data, today, savingsCents: d.savingsCents, horizonYears: years(data) }));
  };

  test("starts on the plan: three labelled sliders with their values, and nothing to store yet", () => {
    const out = sim(haider);
    for (const label of ["Sparen per maand", "Extra inkomen per maand", "Extra uitgaven per maand"]) expect(out).toContain(label);
    expect(out).toContain('aria-valuetext="€\u00a0430,00"');
    expect(out).toContain("Voorstel: 20 % van je inkomen.");
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Zo instellen/);
    expect(out).not.toContain("Zet terug");
    expect(out).toContain("vol rond mei 2027");
  });

  test("the choice between careful and normal only shows for variable income", () => {
    expect(sim(haider)).not.toContain("Wisselend inkomen");
    expect(sim(student)).toContain("Wisselend inkomen");
  });
});
