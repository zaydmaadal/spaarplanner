import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { UserData } from "@/domain/dashboard";
import { Simulator } from "@/components/overview/simulator";
import { haider, tiener } from "@/domain/fixtures/personas";

const m = vi.hoisted(() => ({ data: undefined as unknown, steps: [] as { id: string; title: string; urgency: string }[] }));
vi.mock("@/data/actions/plan", () => ({ savePlanAction: vi.fn() }));
vi.mock("@/data/actions/push", () => ({ removePushSubscriptionAction: vi.fn(), savePushSubscriptionAction: vi.fn() }));
vi.mock("@/data/load", () => ({ loadScreenData: async () => ({ today: "2026-10-20", data: m.data }), loadOpenUserSteps: async () => m.steps }));

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

  test("names the regions of the server components with aria-label (an id from useId there can clash with a hidden page)", async () => {
    const out = await render(haider);
    for (const name of ["Reis", "Verdeling van je loon", "Je potten", "Volgende stappen"]) expect(out).toContain(`<section aria-label="${name}"`);
    expect(out.match(/<section[^>]*aria-labelledby/g)).toHaveLength(1); // the simulator is a client component: its ids are unique in its own tree
  });

  test("without a fixed payday there is no strip", async () => {
    expect(await render(tiener)).not.toContain("Volgende loondag");
  });

  test("a missing name still gets a greeting", async () => {
    expect(headings(await render({ ...haider, profile: { ...haider.profile, displayName: " " } }), 1)).toEqual(["Hoi"]);
  });

  test("next steps: the three most urgent of the rules and the steps the user wrote, rules first within an urgency", async () => {
    m.steps = [
      { id: "a", title: "Later iets", urgency: "later" },
      { id: "b", title: "Stage vinden", urgency: "week" },
    ];
    const out = await render(haider);
    const list = out.slice(out.indexOf("Volgende stappen"));
    expect(list.match(/<li/g)).toHaveLength(3);
    expect(list.indexOf("Zet €\u00a0430,00 opzij")).toBeGreaterThan(-1);
    expect(list.indexOf("Stage vinden")).toBeGreaterThan(list.indexOf("Zet €")); // same urgency: the rule goes first
    expect(list).not.toContain("Later iets"); // less urgent than the rules that fill the list
  });

  test("an urgent step of your own pushes a less urgent rule out", async () => {
    m.steps = [1, 2, 3].map((n) => ({ id: `s${n}`, title: `Eigen ${n}`, urgency: "week" }));
    const list = (await render(haider)).split("Volgende stappen").pop()!;
    expect(list.match(/<li/g)).toHaveLength(3);
    expect(list).toContain("Eigen 1");
    expect(list).toContain("Eigen 2");
    expect(list).not.toContain("Eigen 3");
  });

  test("the simulator starts again when the stored savings or income mode change", async () => {
    const keyOf = (node: unknown): string | null => {
      if (Array.isArray(node)) return node.map(keyOf).find((k) => k !== null) ?? null;
      if (!isValidElement<{ children?: unknown }>(node)) return null;
      return node.type === Simulator ? node.key : keyOf(node.props.children);
    };
    const key = async (plan: Partial<UserData["plan"]>) => {
      m.data = { ...haider, plan: { ...haider.plan, ...plan } };
      return keyOf(await OverviewPage());
    };
    const a = await key({});
    expect(a).not.toBeNull();
    expect(await key({})).toBe(a);
    expect(await key({ monthlySavingsCents: 25000 })).not.toBe(a);
    expect(await key({ incomeMode: "careful" })).not.toBe(a);
  });
});
