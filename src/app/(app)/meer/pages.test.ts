import { renderToStaticMarkup } from "react-dom/server";
import { isValidElement } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { UserData } from "@/domain/dashboard";
import { Step5 } from "@/components/onboarding/step-5";
import { PlanSettingsForm } from "@/components/settings/plan-settings";
import { haider, student } from "@/domain/fixtures/personas";

const m = vi.hoisted(() => ({ data: undefined as unknown, prefs: {} as Record<string, unknown> }));
vi.mock("@/data/load", () => ({ loadScreenData: async () => ({ today: "2026-10-20", data: m.data }) }));
vi.mock("@/data/supabase/server", () => ({ requireUserId: async () => "user-1", readProfile: async () => ({ prefs: m.prefs }) }));
vi.mock("@/data/actions/profile", () => ({}));
vi.mock("@/data/actions/incomes", () => ({}));
vi.mock("@/data/actions/budget", () => ({}));
vi.mock("@/data/actions/plan", () => ({}));
vi.mock("@/data/actions/onboarding", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import ContextPage from "./context/page";
import IncomePage from "./inkomen/page";
import PlanPage from "./plan/page";
import ProfilePage from "./profiel/page";
import ExpensesPage from "./uitgaven/page";

const render = async (page: () => Promise<React.JSX.Element>, data: UserData = haider) => {
  m.data = data;
  return renderToStaticMarkup(await page()).replace(/<!-- -->/g, "").replaceAll("&#x27;", "'");
};
const headings = (out: string, level: number) => [...out.matchAll(new RegExp(`<h${level}[^>]*>(.*?)</h${level}>`, "g"))].map((x) => x[1].replace(/<[^>]+>/g, ""));
const value = (out: string, label: string) => new RegExp(`${label}</label>[\\s\\S]*?value="([^"]*)"`).exec(out)?.[1];
const saveButtons = (out: string) => out.match(/<button[^>]*type="submit"[^>]*>Opslaan<\/button>/g) ?? [];

// The key of the first element of this component in a tree.
const keyOf = (node: unknown, type: unknown): string | null => {
  if (Array.isArray(node)) return node.map((n) => keyOf(n, type)).find((k) => k !== null) ?? null;
  if (!isValidElement<{ children?: unknown }>(node)) return null;
  return node.type === type ? node.key : keyOf(node.props.children, type);
};

beforeEach(() => {
  m.prefs = {};
});

describe.each([
  ["profiel", ProfilePage, "Je naam"],
  ["inkomen", IncomePage, "Wat verdien je?"],
  ["uitgaven", ExpensesPage, "Wat betaal je elke maand vast?"],
  ["plan", PlanPage, "Wat geef je uit en wat spaar je?"],
  ["context", ContextPage, "Wat de app over je weet"],
] as const)("/meer/%s", (_name, page, title) => {
  test("has its own single h1, a form that says Opslaan, no onboarding furniture and the Meer tab active", async () => {
    const out = await render(page);
    expect(headings(out, 1)).toEqual([title]);
    expect(saveButtons(out).length).toBeGreaterThanOrEqual(1);
    for (const onboarding of ["Overslaan", "Vorige", "Volgende", "Stap ", 'role="progressbar"']) expect(out).not.toContain(onboarding);
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
    expect(out).toMatch(/href="\/meer"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/meer"/);
  });

  test("gives every element a unique generated id and uses no em dash", async () => {
    const out = await render(page);
    const ids = [...out.matchAll(/ id="([^"]+)"/g)].map((x) => x[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(out).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("the forms are filled with what is stored", () => {
  test("profiel: the name", async () => {
    expect(value(await render(ProfilePage), "Je naam")).toBe("Haider");
  });

  test("inkomen: step 2 and, below it, step 3 as a second form with an h2", async () => {
    const out = await render(IncomePage);
    expect(value(out, "Netto bedrag")).toBe("2150");
    expect(headings(out, 2).slice(-1)).toEqual(["Krijg je ook eenmalig geld?"]);
    expect(saveButtons(out)).toHaveLength(2);
  });

  test("uitgaven: the stored fixed costs", async () => {
    const out = await render(ExpensesPage, { ...haider, lines: [{ id: "h", kind: "fixed", category: "Huur", name: "Huur", amountCents: 50000, isEstimate: false }] });
    expect(value(out, "Bedrag per maand")).toBe("500");
  });

  test("context: the note, without the palette (that is under Uiterlijk on Meer)", async () => {
    m.prefs = { palette: "smaragd", context_note: "Ik heb 20 vakantiedagen.", no_interest_savings: true };
    const out = await render(ContextPage);
    expect(out).toContain("Ik heb 20 vakantiedagen.</textarea>");
    expect(out).not.toContain("Kleurenpalet");
    expect(out.match(/aria-checked="true"/g)).toHaveLength(1); // the no-interest box is on, the basmala box is off
  });
});

describe("/meer/plan (spec 8.7)", () => {
  test("shows the savings form and how the plan counts, with a save button for each", async () => {
    const out = await render(PlanPage);
    expect(value(out, "Dit wil ik sparen")).toBe("430"); // the proposal is only shown
    expect(headings(out, 2).slice(-1)).toEqual(["Zo rekenen we"]);
    expect(out).toContain("Eenmalig inkomen meetellen");
    expect(saveButtons(out)).toHaveLength(2);
  });

  test("asks about the emergency fund as soon as there is a pot besides the fund, with or without a deadline", async () => {
    const ask = "Noodfonds eerst helemaal vullen, of tegelijk met je doelen?";
    expect(await render(PlanPage)).toContain(ask); // the trip has a deadline
    expect(await render(PlanPage, { ...haider, goals: haider.goals.map((g) => ({ ...g, deadline: null })) })).toContain(ask);
    expect(await render(PlanPage, { ...haider, goals: haider.goals.filter((g) => g.kind === "emergency") })).not.toContain(ask);
    expect(await render(PlanPage, { ...haider, goals: haider.goals.map((g) => ({ ...g, archived: g.kind !== "emergency" })) })).not.toContain(ask);
  });

  test("asks about variable income only when there is some", async () => {
    expect(await render(PlanPage)).not.toContain("Wisselend inkomen");
    const out = await render(PlanPage, student);
    expect(out).toContain("Wisselend inkomen");
    expect(out).toMatch(/checked=""[^>]*value="careful"/);
  });

  test("a stored savings amount is the value of the field", async () => {
    expect(value(await render(PlanPage, { ...haider, plan: { ...haider.plan, monthlySavingsCents: 25000 } }), "Dit wil ik sparen")).toBe("250");
  });
});

describe("the plan forms of a kept-alive visit (Next keeps visited routes mounted)", () => {
  const keys = async (plan: Partial<UserData["plan"]>) => {
    m.data = { ...haider, plan: { ...haider.plan, ...plan } };
    const page = await PlanPage();
    return { savings: keyOf(page, Step5), settings: keyOf(page, PlanSettingsForm) };
  };

  test("the forms start again when a stored value changes, and not before", async () => {
    const a = await keys({});
    expect(a.savings).not.toBeNull();
    expect(a.settings).not.toBeNull();
    expect(await keys({})).toEqual(a);
    expect((await keys({ monthlySavingsCents: 25000 })).savings).not.toBe(a.savings);
    for (const change of [{ incomeMode: "careful" }, { includeOneOffIncome: !haider.plan.includeOneOffIncome }, { emergencySharePct: 50 }] as const) {
      expect((await keys(change)).settings).not.toBe(a.settings);
    }
  });
});
