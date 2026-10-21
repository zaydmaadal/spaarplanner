import { createElement as h, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { goal, income, line, plan } from "@/domain/test-helpers";

// The steps call server actions and the router; render them on the server as plain markup.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/data/actions/onboarding", () => ({}));
vi.mock("@/data/actions/profile", () => ({}));
vi.mock("@/data/actions/incomes", () => ({}));
vi.mock("@/data/actions/budget", () => ({}));
vi.mock("@/data/actions/plan", () => ({}));
vi.mock("@/data/actions/goals", () => ({}));
vi.mock("@/data/actions/checklist", () => ({}));

import { Choice } from "@/components/form-fields";
import { OnboardingProgress } from "./progress";
import { Step1 } from "./step-1";
import { Step2 } from "./step-2";
import { Step3 } from "./step-3";
import { Step4 } from "./step-4";
import { Step5 } from "./step-5";
import { Step6 } from "./step-6";
import { Step7 } from "./step-7";
import { Step8 } from "./step-8";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el).replaceAll("&#x27;", "'");
const value = (page: string, label: string) => new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</label>[\\s\\S]*?value="([^"]*)"`).exec(page)?.[1];
// Haider: € 2.150 a month, nothing else filled in yet.
const haider = income({ amountCents: 215000, paydayRule: { type: "day_of_month", day: 29, weekend: "before" } });
const base7: ComponentProps<typeof Step7> = { mode: "onboarding", today: "2026-10-21", incomes: [haider], lines: [], plan: plan(), goals: [], startBalanceCents: null, emergencyTargetCents: null, stageAdded: false };

describe("shell", () => {
  it("shows progress, 'Overslaan' and 'Vorige' while onboarding, and only 'Opslaan' when editing", () => {
    const step = html(h(Step3, { mode: "onboarding", incomes: [] }));
    expect(step).toContain("Stap 3 van 8");
    expect(step).toContain("Overslaan");
    expect(step).toContain('href="/onboarding/2"');
    expect(step).toContain("Volgende");
    const edit = html(h(Step3, { mode: "edit", incomes: [] }));
    expect(edit).not.toContain("Stap 3 van 8");
    expect(edit).not.toContain("Overslaan");
    expect(edit).not.toContain("Vorige");
    expect(edit).toContain("Opslaan");
  });

  it("has no 'Vorige' on the first step and finishes on the last", () => {
    expect(html(h(Step1, { mode: "onboarding", displayName: "" }))).not.toContain("Vorige");
    const last = html(h(Step8, { mode: "onboarding", palette: "oceaan", noInterestSavings: false, showBasmala: false, contextNote: "", startBalanceCents: null, emergencyTargetCents: null, emergencySharePct: 100 }));
    expect(last).toContain("Naar mijn overzicht");
    expect(last).toContain("Je logt één keer opnieuw in in de geïnstalleerde app.");
    expect(last).toContain("Zet op beginscherm");
    expect(last).toContain("App installeren");
  });

  it("gives every field a unique, generated id", () => {
    const page = html(h(Step7, { ...base7, goals: [goal("a", 100000), goal("b", 200000)] }));
    const ids = [...page.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(6);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("step 1 and 2", () => {
  it("asks for a name, filled with the stored one", () => {
    expect(value(html(h(Step1, { mode: "onboarding", displayName: "Haider" })), "Je naam")).toBe("Haider");
  });

  it("asks for the net amount and a payday for a monthly income, a weekday for a weekly one", () => {
    const monthly = html(h(Step2, { mode: "onboarding", incomes: [haider], firstJob: true }));
    expect(value(monthly, "Netto bedrag")).toBe("2150");
    expect(value(monthly, "Dag van de maand")).toBe("29");
    expect(monthly).toContain("Dit is mijn eerste job");
    const weekly = html(h(Step2, { mode: "onboarding", incomes: [income({ frequency: "weekly", paydayRule: { type: "weekday", weekday: 5 } })], firstJob: false }));
    expect(weekly).toContain("Op welke dag krijg je het?");
    expect(weekly).not.toContain("Dag van de maand");
  });

  it("asks for the lowest amount only for a variable income, and lists the other incomes as extra", () => {
    const variable = income({ variability: "variable", amountLowCents: 150000 });
    const page = html(h(Step2, { mode: "onboarding", incomes: [variable, income({ id: "zakgeld", name: "Zakgeld", kind: "allowance", amountCents: 5000 })], firstJob: false }));
    expect(value(page, "Laagste bedrag dat je verwacht")).toBe("1500");
    expect(page).toContain('aria-label="Zakgeld"');
  });
});

describe("step 3 and 4", () => {
  it("shows stored costs with their preset switched on and the amount filled in, and a custom cost with its own name field", () => {
    const huur = { ...line("fixed", 50000), id: "h", name: "Huur" };
    const mama = { ...line("fixed", 100000), id: "m", name: "Mama" };
    const page = html(h(Step4, { mode: "onboarding", lines: [huur, mama, line("living", 20000)] }));
    expect(page).toMatch(/aria-pressed="true"[^>]*>(<[^>]+>)*Huur/);
    expect(page).toMatch(/aria-pressed="false"[^>]*>Gsm/);
    expect(page).toContain('aria-label="Mama"');
    expect(page).toContain(">Naam</label>"); // only the custom cost asks for a name
    expect(page.match(/>Naam<\/label>/g)).toHaveLength(1);
    expect(page.match(/Bedrag per maand<\/label>/g)).toHaveLength(2); // the living line is not a fixed cost
  });

  it("shows a stored yearly income with its month", () => {
    const month = income({ id: "v", name: "Vakantiegeld", frequency: "yearly", month: 5, amountCents: 150000, kind: "other" });
    const page = html(h(Step3, { mode: "onboarding", incomes: [haider, month] }));
    expect(page).toMatch(/aria-pressed="true"[^>]*>(<[^>]+>)*Vakantiegeld/);
    expect(value(page, "Bedrag")).toBe("1500");
    expect(page).toMatch(/<option value="5" selected="">mei<\/option>/);
  });
});

describe("accessibility details", () => {
  it("ties a Choice error to its fieldset", () => {
    const page = html(h(Choice, { legend: "Wanneer?", value: "a", options: [{ value: "a", label: "A" }], onChange: () => {}, error: "Kies een dag." }));
    const described = /<fieldset[^>]*aria-describedby="([^"]+)"/.exec(page)?.[1];
    expect(described).toBeTruthy();
    expect(page).toContain(`id="${described}"`);
    expect(html(h(Choice, { legend: "Wanneer?", value: "a", options: [{ value: "a", label: "A" }], onChange: () => {} }))).not.toContain("aria-describedby");
  });

  it("says the step in text and hides the bar that only pictures it", () => {
    const page = html(h(OnboardingProgress, { step: 3 }));
    expect(page).toContain("Stap 3 van 8");
    expect(page).toMatch(/<div aria-hidden="true"><div role="progressbar"/);
  });
});

describe("step 2 extra incomes", () => {
  const kinds = (page: string) => [...(/Soort<\/label><select[^>]*>([\s\S]*?)<\/select>/.exec(page)?.[1] ?? "").matchAll(/>([^<]+)<\/option>/g)].map((m) => m[1]);

  it("cannot be made salary, so the main income keeps its role after a reload", () => {
    const zakgeld = income({ id: "zakgeld", name: "Zakgeld", kind: "allowance", amountCents: 5000 });
    const page = html(h(Step2, { mode: "onboarding", incomes: [haider, zakgeld], firstJob: false }));
    expect(kinds(page)).toEqual(["Bijberoep of flexi-job", "Studentenjob", "Zakgeld", "Uitkering", "Iets anders"]);
  });

  it("still shows a second salary that was made elsewhere", () => {
    const partner = income({ id: "partner", name: "Partner", amountCents: 100000 });
    expect(kinds(html(h(Step2, { mode: "onboarding", incomes: [partner, { ...haider, id: "a" }].sort((a, b) => (a.id < b.id ? 1 : -1)), firstJob: false })))).toContain("Loon");
  });
});

describe("step 5", () => {
  it("proposes 20 % of the income as 'Dit wil ik sparen' when there are no expenses (Haider: € 430)", () => {
    const page = html(h(Step5, { mode: "onboarding", incomes: [haider], lines: [], plan: plan() }));
    expect(value(page, "Dit wil ik sparen")).toBe("430");
    expect(page).toContain("Ons voorstel: 20 %");
  });

  it("follows the room once expenses exist, and a stored amount wins", () => {
    const lines = [line("fixed", 100000)];
    const room = html(h(Step5, { mode: "onboarding", incomes: [haider], lines, plan: plan() }));
    expect(value(room, "Dit wil ik sparen")).toBe("1150");
    const stored = html(h(Step5, { mode: "onboarding", incomes: [haider], lines, plan: plan({ monthlySavingsCents: 25000 }) }));
    expect(value(stored, "Dit wil ik sparen")).toBe("250");
  });

  it("warns when more is spent than earned, and when the wish is above what is left", () => {
    const over = html(h(Step5, { mode: "onboarding", incomes: [haider], lines: [line("fixed", 300000)], plan: plan() }));
    expect(over).toContain("Je geeft meer uit dan je verdient");
    const wish = html(h(Step5, { mode: "onboarding", incomes: [haider], lines: [line("fixed", 200000)], plan: plan({ monthlySavingsCents: 50000 }) }));
    expect(wish).toContain("Je wil €\u00a0500,00 sparen maar houdt €\u00a0150,00 over.");
  });
});

describe("step 6", () => {
  it("suggests € 1.000 as an estimate without expenses and 3 times the expenses with them", () => {
    const none = html(h(Step6, { mode: "onboarding", lines: [], startBalanceCents: null, emergencyTargetCents: null }));
    expect(value(none, "Doelbedrag voor je noodfonds")).toBe("1000");
    expect(none).toContain("Voorstel: €\u00a01.000,00");
    const some = html(h(Step6, { mode: "onboarding", lines: [line("fixed", 165000)], startBalanceCents: 600000, emergencyTargetCents: null }));
    expect(value(some, "Doelbedrag voor je noodfonds")).toBe("4950");
    expect(value(some, "Hoeveel spaargeld heb je nu?")).toBe("6000");
    expect(some).toContain("zetten we op je hoofddoel");
  });
});

describe("step 7", () => {
  it("offers the example goals with their estimates and the checklist card", () => {
    const page = html(h(Step7, base7));
    for (const text of ["Reis", "€\u00a01.500,00", "Rijbewijs", "Laptop", "€\u00a01.000,00", "Auto", "€\u00a08.000,00", "Huwelijk", "€\u00a010.000,00", "Hajj", "€\u00a07.000,00", "Stage vinden", "Iets anders"]) {
      expect(page).toContain(text);
    }
    expect(page).not.toContain("Noodfonds eerst helemaal vullen");
  });

  it("asks about the emergency fund as soon as a goal has a deadline, and previews the timeline", () => {
    const trip = { ...goal("reis", 250000, { deadline: { year: 2027, month: 7 } }), name: "Reis", kind: "trip" as const };
    const page = html(h(Step7, { ...base7, goals: [trip] }));
    expect(page).toContain("Noodfonds eerst helemaal vullen, of tegelijk met je doelen?");
    expect(page).toContain("Eerst noodfonds");
    expect(page).toContain("Tegelijk");
    expect(page).toContain("Zo ziet je planning eruit");
    expect(page).toContain("Noodfonds");
    expect(page).toMatch(/vol rond \w{3} 20\d\d/);
    expect(value(page, "Klaar tegen (optioneel)")).toBe("2027-07");
  });
});

describe("the forms on the pages of Meer (mode edit)", () => {
  it("can be the second form of a page: an h2, so the page keeps one h1", () => {
    const first = html(h(Step2, { mode: "edit", incomes: [haider], firstJob: false }));
    const second = html(h(Step3, { mode: "edit", incomes: [], level: 2 }));
    expect(first.match(/<h1/g)).toHaveLength(1);
    expect(second).not.toContain("<h1");
    expect(second).toMatch(/<h2[^>]*>Krijg je ook eenmalig geld\?<\/h2>/);
    expect(html(h(Step3, { mode: "edit", incomes: [] }))).toMatch(/<h1[^>]*>Krijg je ook eenmalig geld\?<\/h1>/);
  });

  it("step 8 leaves the palette to Uiterlijk and keeps the other answers and the note", () => {
    const props = { palette: "oceaan" as const, noInterestSavings: true, showBasmala: false, contextNote: "Ik heb 20 vakantiedagen.", startBalanceCents: null, emergencyTargetCents: null, emergencySharePct: 100 };
    const edit = html(h(Step8, { mode: "edit", ...props }));
    expect(edit).toMatch(/<h1[^>]*>Wat de app over je weet<\/h1>/);
    expect(edit).not.toContain("Kleurenpalet");
    expect(edit).toContain("Ik wil sparen zonder rente");
    expect(edit).toContain("Ik heb 20 vakantiedagen.</textarea>");
    expect(html(h(Step8, { mode: "onboarding", ...props }))).toContain("Kleurenpalet");
  });

  it("step 5 does not call a typed savings amount 'what is left'", () => {
    const typed = html(h(Step5, { mode: "edit", incomes: [haider], lines: [line("fixed", 100000)], plan: plan({ monthlySavingsCents: 25000 }) }));
    expect(typed).toContain("Laat dit leeg om te sparen wat je overhoudt.");
    expect(typed).not.toContain("Dit is wat er overblijft. Pas het aan");
    const follows = html(h(Step5, { mode: "edit", incomes: [haider], lines: [line("fixed", 100000)], plan: plan() }));
    expect(follows).toContain("Dit is wat er overblijft. Pas het aan");
  });

  it("a stored income or expense that is not a row of a list has its own Verwijderen button on a Meer page, and not while onboarding", () => {
    const eten = { ...line("living", 20000), id: "eten", name: "Eten" };
    expect(html(h(Step2, { mode: "edit", incomes: [haider], firstJob: false }))).toContain('aria-label="Netto bedrag verwijderen"');
    expect(html(h(Step2, { mode: "edit", incomes: [], firstJob: false }))).not.toContain("Netto bedrag verwijderen"); // nothing stored
    expect(html(h(Step2, { mode: "onboarding", incomes: [haider], firstJob: false }))).not.toContain("Netto bedrag verwijderen");
    expect(html(h(Step5, { mode: "edit", incomes: [haider], lines: [eten], plan: plan() }))).toMatch(/aria-label="Eten verwijderen"/);
    expect(html(h(Step5, { mode: "edit", incomes: [haider], lines: [eten], plan: plan() })).match(/ verwijderen"/g)).toHaveLength(1); // only the stored one
    expect(html(h(Step5, { mode: "onboarding", incomes: [haider], lines: [eten], plan: plan() }))).not.toContain(" verwijderen");
  });
});
