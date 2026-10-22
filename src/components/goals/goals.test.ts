import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { buildDashboard } from "@/domain/dashboard";
import { haider } from "@/domain/fixtures/personas";
import { draftGoals, previewInputs } from "./effect";
import { EffectPreview } from "./effect-preview";
import { GoalCard } from "./goal-card";
import { History } from "./history";

// The card has the arrows, which call a server action.
vi.mock("@/data/actions/goals", () => ({ reorderGoalsAction: vi.fn() }));

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el).replace(/<!-- -->/g, "");
const base = buildDashboard(haider, "2026-10-20");
const preview = (name: string, target: string, deadline = "") => {
  const { before, after } = previewInputs(base.projectionInput, draftGoals(base.projectionInput.goals, { name, target, deadline }, null)!, null);
  return html(h(EffectPreview, { before, after }));
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
    expect(out).toContain("Verschuif de deadline van Rijbewijs");
  });

  test("an unchanged form has nothing to show", () => {
    const { before, after } = previewInputs(base.projectionInput, base.projectionInput.goals, null);
    expect(html(h(EffectPreview, { before, after }))).toContain("Je hebt nog niets aangepast.");
  });
});

describe("History", () => {
  const bookings = [
    { id: "b", amountCents: -5000, occurredOn: "2026-10-12", note: null },
    { id: "a", amountCents: 21500, occurredOn: "2026-10-02", note: "Startsaldo" },
  ];

  test("lists the bookings newest first with words for the kind and a closing balance", () => {
    const out = html(h(History, { bookings, balanceCents: 16500 }));
    expect(out).toContain("Geschiedenis");
    expect(out).toContain("12 oktober 2026");
    expect(out).toContain("Opname");
    expect(out).toContain("Storting · Startsaldo");
    expect(out).toContain("− € 50,00");
    expect(out).toContain("€ 215,00");
    expect(out.match(/<li/g)).toHaveLength(2); // the balance row is not a booking
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
  const ids = base.goals.map((g) => g.id);
  const card = (i: number) => html(h("ul", null, h(GoalCard, { goal: base.goals[i], index: i, ids, horizonYears: 10 })));

  test("links the name to the goal, shows the main goal and the fill month", () => {
    const out = card(1);
    expect(out).toContain('href="/doelen/reis"');
    expect(out).toContain("Hoofddoel");
    expect(out).toContain("vol rond mei 2027");
    expect(out).toContain("Voortgang Reis");
  });

  test("the first goal cannot go up, the last cannot go down", () => {
    expect(card(0)).toMatch(/aria-label="Zet Noodfonds hoger"[^>]*disabled/);
    expect(card(0)).not.toMatch(/aria-label="Zet Noodfonds lager"[^>]*disabled/);
    expect(card(1)).toMatch(/aria-label="Zet Reis lager"[^>]*disabled/);
  });
});
