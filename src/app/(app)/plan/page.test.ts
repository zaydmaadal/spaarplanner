import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { buildDashboard, type UserData } from "@/domain/dashboard";
import { formatMonthNl } from "@/domain/dates";
import { haider } from "@/domain/fixtures/personas";
import type { YearMonth } from "@/domain/types";

const m = vi.hoisted(() => ({ data: undefined as unknown, steps: [] as { id: string; title: string; urgency: string }[] }));
vi.mock("@/data/actions/checklist", () => ({ closeRuleItemAction: vi.fn(), toggleChecklistItemAction: vi.fn(), addChecklistItemAction: vi.fn() }));
vi.mock("@/data/load", () => ({ loadScreenData: async () => ({ today: "2026-10-20", data: m.data }), loadOpenUserSteps: async () => m.steps }));

import PlanPage from "./page";

const TODAY = "2026-10-20";
const render = async (data: UserData) => {
  m.data = data;
  return renderToStaticMarkup(await PlanPage()).replace(/<!-- -->/g, "");
};
const headings = (out: string, level: number) => [...out.matchAll(new RegExp(`<h${level}[^>]*>(.*?)</h${level}>`, "g"))].map((x) => x[1].replace(/<[^>]+>/g, ""));

beforeEach(() => {
  m.steps = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("the plan page (spec 8.6)", () => {
  test("has one h1, the timeline and the checklist, and the Plan tab active", async () => {
    const out = await render(haider);
    expect(headings(out, 1)).toEqual(["Plan"]);
    expect(headings(out, 2)).toEqual(["Tijdlijn", "Checklist"]);
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
    expect(out).toMatch(/href="\/plan"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/plan"/);
    expect(out).not.toContain(String.fromCharCode(0x2014));
  });

  test("lists the pots in the order they fill, not the order of the list, with the month of each", async () => {
    const d = buildDashboard(haider, TODAY);
    const [fund, trip] = d.goals;
    expect(fund.name).toBe("Noodfonds");
    // The trip first in the list; the fund still fills first.
    const out = await render({ ...haider, goals: [...haider.goals].reverse() });
    const timeline = out.slice(out.indexOf("Tijdlijn"), out.indexOf("Checklist"));
    expect(headings(timeline, 3)).toEqual(["Noodfonds", "Reis"]);
    expect(timeline).toContain(formatMonthNl(fund.fill as YearMonth));
    expect(timeline).toContain(formatMonthNl(trip.fill as YearMonth));
    expect(timeline.indexOf(formatMonthNl(fund.fill as YearMonth))).toBeLessThan(timeline.indexOf("Noodfonds"));
  });

  test("says so when there are no pots yet, and offers the first one", async () => {
    const out = await render({ ...haider, goals: [] });
    expect(out).toContain("Nog geen doelen.");
    expect(out).toContain('href="/doelen/nieuw"');
    expect(headings(out, 3).filter((h) => h === "Noodfonds")).toEqual([]);
  });

  test("groups the checklist as this week, this month and later, with the rule steps before the own steps", async () => {
    m.steps = [
      { id: "own-1", title: "Stage vinden", urgency: "week" },
      { id: "own-2", title: "Rijbewijs plannen", urgency: "later" },
    ];
    const out = await render(haider);
    const list = out.slice(out.indexOf("Checklist"));
    expect(headings(list, 3)).toEqual(["Deze week", "Deze maand", "Later"]);
    expect(list.indexOf("Zet € 430,00 opzij op 29 oktober")).toBeLessThan(list.indexOf("Stage vinden"));
    expect(list.indexOf("Stage vinden")).toBeLessThan(list.indexOf("Sluit aan bij een ziekenfonds"));
    expect(list.indexOf("Zoek de echte prijs van Reis op")).toBeLessThan(list.indexOf("Rijbewijs plannen"));
  });

  test("gives every step a tick and a dismiss button that name the step", async () => {
    m.steps = [{ id: "own-1", title: "Stage vinden", urgency: "week" }];
    const out = await render(haider);
    const steps = buildDashboard(haider, TODAY).rules.length + 1;
    expect(out.match(/aria-label="Afvinken: /g)).toHaveLength(steps);
    expect(out.match(/aria-label="Wegklikken: /g)).toHaveLength(steps);
    expect(out).toContain('aria-label="Afvinken: Stage vinden"');
    expect(out).toContain('aria-label="Wegklikken: Zet € 430,00 opzij op 29 oktober"');
  });

  test("leaves out the rule steps that were closed", async () => {
    expect(await render(haider)).toContain("Zet een automatische overschrijving klaar");
    expect(await render({ ...haider, closedRuleKeys: ["standing_order"] })).not.toContain("Zet een automatische overschrijving klaar");
  });

  test("without steps it says so, and still offers a step of your own", async () => {
    const closed = buildDashboard(haider, TODAY).rules.map((r) => r.key);
    const out = await render({ ...haider, closedRuleKeys: closed });
    expect(out).toContain("Je hebt geen open stappen.");
    expect(headings(out.slice(out.indexOf("Checklist")), 3)).toEqual([]);
    expect(out).toMatch(/<label[^>]*>Wat wil je nog doen\?<\/label>/);
    expect(out).toMatch(/<button[^>]*type="submit"[^>]*>Eigen stap toevoegen<\/button>/);
  });
});
