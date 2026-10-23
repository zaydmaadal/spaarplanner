import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { buildDashboard } from "@/domain/dashboard";
import { haider } from "@/domain/fixtures/personas";
import { draftGoals, previewInputs } from "./effect";
import { EffectPreview } from "./effect-preview";
import { GoalCard } from "./goal-card";
import { History } from "./history";

// The ways out call a server action and refresh the router.
vi.mock("@/data/actions/plan", () => ({ savePlanAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el).replace(/<!-- -->/g, "");
const base = buildDashboard(haider, "2026-10-20");
const preview = (name: string, target: string, deadline = "") => {
  const { before, after } = previewInputs(base.projectionInput, draftGoals(base.projectionInput.goals, { name, target, deadline }, null)!, null);
  return html(h(EffectPreview, { before, after, savingsCents: base.savingsCents, onDeadline: vi.fn(), onTarget: vi.fn() }));
};

describe("EffectPreview", () => {
  test("says when the new goal is full and which goal slips, under its own heading", () => {
    const out = preview("Laptop", "1200");
    expect(out).toContain("Wat dit verandert");
    expect(out).toContain("Klaar rond jun 2027");
    expect(out).toContain("<li>Reis schuift 2 maanden op, van mei 2027 naar jul 2027</li>");
    expect(out).not.toContain("Niet haalbaar");
  });

  test("a goal that moves nothing says so", () => {
    expect(preview("Boek", "50")).toContain("Je andere potten blijven op hetzelfde moment vol.");
  });

  test("a deadline in the past names the status in words and the way out", () => {
    const out = preview("Rijbewijs", "1500", "2020-01");
    expect(out).toContain("Niet haalbaar");
    expect(out).toContain("Schuif de deadline naar");
    expect(out).not.toContain("Verlaag het doel"); // no target is full before a deadline that has passed
  });

  test("an unchanged form has nothing to show", () => {
    const { before, after } = previewInputs(base.projectionInput, base.projectionInput.goals, null);
    expect(html(h(EffectPreview, { before, after, savingsCents: 0, onDeadline: vi.fn(), onTarget: vi.fn() }))).toContain("Je hebt nog niets aangepast.");
  });
});

describe("History", () => {
  const bookings = [
    { id: "b", amountCents: -5000, occurredOn: "2026-10-12", note: null, source: "manual" },
    { id: "a", amountCents: 21500, occurredOn: "2026-10-02", note: "Startsaldo", source: "start" },
    { id: "c", amountCents: 1000, occurredOn: "2026-10-03", note: "Verjaardag", source: "manual" },
  ];

  test("lists the bookings newest first with words for the kind and a closing balance", () => {
    const out = html(h(History, { bookings, balanceCents: 16500 }));
    expect(out).toContain("Geschiedenis");
    expect(out).toContain("12 oktober 2026");
    expect(out).toContain("Opname");
    expect(out).toContain("Storting · Verjaardag");
    expect(out).toContain("Startbedrag");
    expect(out).not.toContain("Startsaldo");
    expect(out).not.toContain("Storting · Startsaldo");
    expect(out).toContain("− € 50,00");
    expect(out).toContain("€ 215,00");
    expect(out.match(/<li/g)).toHaveLength(3); // the balance row is not a booking
    expect(out).toContain("Saldo");
    expect(out).toContain("€ 165,00");
  });

  test("no bookings is one sentence", () => {
    const out = html(h(History, { bookings: [], balanceCents: 0 }));
    expect(out).toContain("Nog geen stortingen of opnames.");
    expect(out).not.toContain("Saldo");
  });
});

describe("GoalCard", () => {
  const card = (i: number) => html(h("ul", null, h(GoalCard, { goal: base.goals[i], horizonYears: 10, handle: h("button", null, "greep") })));

  test("the whole card is the link: the name's link covers it, the handle sits next to it", () => {
    const out = card(1);
    expect(out).toContain('href="/doelen/reis"');
    expect(out).toContain("after:absolute after:inset-0");
    expect(out).toContain("greep");
  });

  test("shows the main goal, the fill month and the colour of the goal", () => {
    const out = card(1);
    expect(out).toContain("Hoofddoel");
    expect(out).toContain("vol rond mei 2027");
    expect(out).toContain("Voortgang Reis");
    expect(out).toContain("var(--color-pot-1)"); // a goal without a stored colour takes the first
    expect(html(h(GoalCard, { goal: { ...base.goals[1], colorToken: "pot-3" }, horizonYears: 10, handle: null }))).toContain("var(--color-pot-3)");
  });

  test("says what this month's amount is: already put aside of what the plan asks", () => {
    const goal = { ...base.goals[1], allocatedCents: 25_000, bookedCents: 10_000 };
    expect(html(h(GoalCard, { goal, horizonYears: 10, handle: null }))).toContain("Deze maand al opzij:");
    expect(html(h(GoalCard, { goal, horizonYears: 10, handle: null }))).toContain("€\u00a0100,00");
  });
});
