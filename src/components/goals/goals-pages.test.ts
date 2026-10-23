import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { UserData } from "@/domain/dashboard";
import { haider } from "@/domain/fixtures/personas";
import { fakeDb } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ data: undefined as unknown, db: undefined as unknown }));
vi.mock("@/data/actions/goals", () => ({ reorderGoalsAction: vi.fn(), archiveGoalAction: vi.fn(), setMainGoalAction: vi.fn(), unarchiveGoalAction: vi.fn(), saveGoalAction: vi.fn() }));
vi.mock("@/data/actions/plan", () => ({ savePlanAction: vi.fn() }));
vi.mock("@/data/actions/transactions", () => ({ addTransactionsAction: vi.fn() }));
vi.mock("@/data/load", () => ({ loadScreenData: async () => ({ today: "2026-10-20", data: m.data }) }));
vi.mock("@/data/supabase/server", () => ({ createServerSupabase: async () => m.db }));
vi.mock("next/navigation", async (original) => ({ ...(await original<typeof import("next/navigation")>()), useRouter: () => ({ push: vi.fn() }) }));

import DepositPage from "@/app/(app)/storten/page";
import EditGoalPage from "@/app/(app)/doelen/[id]/aanpassen/page";
import GoalPage from "@/app/(app)/doelen/[id]/page";
import GoalsPage from "@/app/(app)/doelen/page";
import NewGoalPage from "@/app/(app)/doelen/nieuw/page";

// Haider with real ids (the pages refuse anything that is not a uuid).
const FUND = "00000000-0000-4000-8000-000000000001";
const TRIP = "00000000-0000-4000-8000-000000000002";
const ids: Record<string, string> = { nood: FUND, reis: TRIP };
const data = (over: Partial<UserData> = {}): UserData => ({ ...haider, goals: haider.goals.map((g) => ({ ...g, id: ids[g.id] })), ...over });

const clean = (out: string) => out.replace(/<!-- -->/g, "");
const render = async (el: Promise<React.JSX.Element>) => clean(renderToStaticMarkup(await el));
const headings = (out: string, level: number) => [...out.matchAll(new RegExp(`<h${level}[^>]*>(.*?)</h${level}>`, "g"))].map((x) => x[1].replace(/<[^>]+>/g, ""));
const goalPage = (id: string) => render(GoalPage({ params: Promise.resolve({ id }) } as never) as never);
const notFound = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };
const depositPage = (query: Record<string, string> = {}) => render(DepositPage({ searchParams: Promise.resolve(query) } as never) as never);

beforeEach(() => {
  m.data = data();
  m.db = fakeDb(() => ({ data: [] })).client;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("the goals list", () => {
  test("has one h1, a card per goal in order, the new-goal link and the Doelen tab active", async () => {
    const out = await render(GoalsPage());
    expect(headings(out, 1)).toEqual(["Doelen"]);
    expect(headings(out, 2)).toEqual(["Noodfonds", "Reis"]);
    expect(out).toContain('href="/doelen/nieuw"');
    expect(out).toMatch(/href="\/doelen"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/doelen"/);
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
  });

  test("archived goals are not listed", async () => {
    m.data = data({ goals: data().goals.map((g) => (g.id === TRIP ? { ...g, archived: true } : g)) });
    expect(headings(await render(GoalsPage()), 2)).toEqual(["Noodfonds"]);
  });

  test("without goals: one sentence", async () => {
    m.data = data({ goals: [] });
    expect(await render(GoalsPage())).toContain("Nog geen doelen. Maak je eerste doel.");
  });
});

describe("a goal", () => {
  test("shows the trip with its numbers, the actions that fit a main goal and its history", async () => {
    m.db = fakeDb(() => ({ data: [{ id: "t1", amount_cents: 10000, occurred_on: "2026-10-01", note: null }] })).client;
    const out = await goalPage(TRIP);
    expect(headings(out, 1)).toEqual(["Reis"]);
    expect(headings(out, 2)).toEqual(["Geschiedenis"]);
    for (const part of ["Hoofddoel", "vol rond mei 2027", "Deadline", "aug 2027", `href="/storten?pot=${TRIP}"`, `href="/storten?pot=${TRIP}&amp;soort=opname"`, `href="/doelen/${TRIP}/aanpassen"`, "Archiveren", "1 oktober 2026"]) {
      expect(out).toContain(part);
    }
    expect(out).not.toContain("Als hoofddoel instellen");
    expect(out).toMatch(/aria-current="page"[^>]*>.*?Doelen|href="\/doelen"[^>]*aria-current="page"/);
  });

  test("the emergency fund can become the main goal but not be archived", async () => {
    const out = await goalPage(FUND);
    expect(out).toContain("Noodfonds");
    expect(out).toContain("Als hoofddoel instellen");
    expect(out).not.toContain("Archiveren");
  });

  test("a goal that cannot be reached says what to do", async () => {
    m.data = data({ goals: data().goals.map((g) => (g.id === TRIP ? { ...g, deadline: { year: 2026, month: 1 } } : g)) });
    const out = await goalPage(TRIP);
    expect(out).toContain("Niet haalbaar");
    expect(out).toContain("Zo haal je het toch");
    expect(out).toContain(`href="/doelen/${TRIP}/aanpassen?deadline=`);
  });

  test("an unknown, archived or malformed id is a 404", async () => {
    await expect(goalPage("00000000-0000-4000-8000-0000000000ff")).rejects.toMatchObject(notFound);
    await expect(goalPage("reis")).rejects.toMatchObject(notFound);
    m.data = data({ goals: data().goals.map((g) => (g.id === TRIP ? { ...g, archived: true } : g)) });
    await expect(goalPage(TRIP)).rejects.toMatchObject(notFound);
  });
});

describe("new and edit", () => {
  test("a new goal has its own h1 and the form with a deadline field", async () => {
    const out = await render(NewGoalPage());
    expect(headings(out, 1)).toEqual(["Nieuw doel"]);
    for (const part of ["Naam", "Doelbedrag", "Klaar tegen (optioneel)", "Doel opslaan"]) expect(out).toContain(part);
    expect(out).not.toContain("Wat dit verandert"); // the preview waits for a change
  });

  test("editing starts from the stored goal and shows what it would change", async () => {
    const out = await render(EditGoalPage({ params: Promise.resolve({ id: TRIP }), searchParams: Promise.resolve({}) } as never) as never);
    expect(headings(out, 1)).toEqual(["Doel aanpassen"]);
    expect(out).toContain('value="Reis"');
    expect(out).toContain('value="2500"');
    expect(out).toContain('value="2027-08"');
    expect(out).not.toContain("Wat dit verandert"); // nothing changed yet
  });

  test("a way out from the goal screen fills in the field and shows what it does", async () => {
    const out = await render(EditGoalPage({ params: Promise.resolve({ id: TRIP }), searchParams: Promise.resolve({ doelbedrag: "2000", deadline: "nonsense" }) } as never) as never);
    expect(out).toContain('value="2000"');
    expect(out).toContain('value="2027-08"'); // an invalid month is ignored
    expect(out).toContain("Wat dit verandert");
  });

  test("the emergency fund has no deadline field", async () => {
    const out = await render(EditGoalPage({ params: Promise.resolve({ id: FUND }), searchParams: Promise.resolve({}) } as never) as never);
    expect(out).not.toContain("Klaar tegen");
  });

  test("editing an unknown goal is a 404", async () => {
    await expect(render(EditGoalPage({ params: Promise.resolve({ id: "reis" }), searchParams: Promise.resolve({}) } as never) as never)).rejects.toMatchObject(notFound);
  });
});

describe("the deposit screen", () => {
  const fields = (out: string) => out.match(/inputMode="decimal"/g)?.length;

  test("every pot is prefilled with its share of this period and the total is the savings amount", async () => {
    const out = await depositPage();
    expect(headings(out, 1)).toEqual(["Storten"]);
    expect(out).toContain("Totaal");
    expect(out).toContain("€ 430,00");
    expect(out).toContain('value="430"'); // the fund takes everything this period (share 100 %)
    expect(out).toContain(">Opslaan<");
    expect(out).toMatch(/href="\/storten"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/storten"/);
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
    expect(fields(out)).toBe(2);
  });

  test("one pot from its own screen", async () => {
    const out = await depositPage({ pot: TRIP });
    expect(out).toContain("Reis");
    expect(out).not.toContain("Noodfonds");
  });

  test("a withdrawal starts empty", async () => {
    const out = await depositPage({ pot: TRIP, soort: "opname" });
    expect(out).toContain("Hoeveel haal je weg?");
    expect(out).not.toMatch(/value="[1-9]/);
  });

  test("without goals: one sentence and one action to the new-goal form, no deposit form", async () => {
    m.data = data({ goals: [] });
    const out = await depositPage();
    expect(headings(out, 1)).toEqual(["Storten"]);
    expect(out).toContain("Je hebt nog geen doelen om op te storten.");
    expect(out).toMatch(/<a[^>]*href="\/doelen\/nieuw"[^>]*>Maak je eerste doel<\/a>/);
    expect(out).not.toContain("<form");
    expect(out).toMatch(/aria-current="page"[^>]*href="\/storten"|href="\/storten"[^>]*aria-current="page"/); // the nav stays
  });

  test("what is already booked this period is not prefilled again", async () => {
    m.data = data({ depositsThisPeriod: { [FUND]: 43000 } });
    const out = await depositPage();
    expect(out).not.toContain('value="430"');
    expect(out).toContain("€ 0,00");
  });
});
