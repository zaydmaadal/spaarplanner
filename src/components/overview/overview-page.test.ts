import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { UserData } from "@/domain/dashboard";
import { haider, tiener } from "@/domain/fixtures/personas";

const m = vi.hoisted(() => ({ data: undefined as unknown, steps: [] as { id: string; title: string; urgency: string }[] }));
vi.mock("@/data/actions/plan", () => ({ savePlanAction: vi.fn() }));
vi.mock("@/data/load", () => ({ loadUserData: async () => m.data }));
vi.mock("@/data/supabase/server", () => {
  // The page awaits the query builder after .is() twice; a thenable stands in for it.
  const query: Record<string, unknown> = { select: () => query, eq: () => query, is: () => query, then: (resolve: (v: unknown) => void) => resolve({ data: m.steps, error: null }) };
  return { requireUserId: async () => "user-1", readProfile: async () => ({ timezone: "Europe/Brussels" }), createServerSupabase: async () => ({ from: () => query }) };
});

import OverviewPage from "@/app/(app)/overzicht/page";

const render = async (data: UserData) => {
  m.data = data;
  return renderToStaticMarkup(await OverviewPage()).replace(/<!-- -->/g, "");
};
const headings = (out: string, level: number) => [...out.matchAll(new RegExp(`<h${level}[^>]*>(.*?)</h${level}>`, "g"))].map((x) => x[1]);

beforeEach(() => {
  m.steps = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("the overview page (spec 8.3)", () => {
  test("greets by name and shows the sections in order, with the payday strip first", async () => {
    const out = await render(haider);
    expect(headings(out, 1)).toEqual(["Hoi Haider"]);
    expect(headings(out, 2)).toEqual(["Reis", "Verdeling van je loon", "Je potten", "Wat als?", "Volgende stappen"]);
    expect(out.indexOf("Volgende loondag")).toBeGreaterThan(out.indexOf("Hoi Haider"));
    expect(out.indexOf("Volgende loondag")).toBeLessThan(out.indexOf("Hoofddoel"));
    expect(out).toContain("dinsdag 20 oktober");
    expect(out).toContain('aria-current="page"'); // the nav, with Overzicht active
  });

  test("without a fixed payday there is no strip", async () => {
    expect(await render(tiener)).not.toContain("Volgende loondag");
  });

  test("a missing name still gets a greeting", async () => {
    expect(headings(await render({ ...haider, profile: { ...haider.profile, displayName: " " } }), 1)).toEqual(["Hoi"]);
  });

  test("next steps: the first three rules, then the steps the user wrote, most urgent first", async () => {
    m.steps = [
      { id: "a", title: "Later iets", urgency: "later" },
      { id: "b", title: "Stage vinden", urgency: "week" },
    ];
    const out = await render(haider);
    const list = out.slice(out.indexOf("Volgende stappen"));
    expect(list).toContain("Zet € 430,00 opzij op 29 oktober");
    expect(list.indexOf("Stage vinden")).toBeGreaterThan(list.indexOf("Zet €"));
    expect(list.indexOf("Stage vinden")).toBeLessThan(list.indexOf("Later iets"));
    expect(list.match(/<li/g)).toHaveLength(5); // 3 rules + 2 own
  });
});
