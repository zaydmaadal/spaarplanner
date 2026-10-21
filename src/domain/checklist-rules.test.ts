import { describe, expect, test } from "vitest";
import { derived } from "./certainty";
import { evaluateRules, type RuleContext, type RuleItem } from "./checklist-rules";
import { EXTRA_NEEDED_CAP } from "./projection";
import { income } from "./test-helpers";

const ctx = (overrides: Partial<RuleContext> = {}): RuleContext => ({
  periodStart: "2026-09-29",
  nextPayday: null,
  depositDueCents: 0,
  budget: { incomeCents: 200000, expensesCents: 150000, roomCents: 50000 },
  warnings: [],
  goals: [],
  incomes: [],
  prefs: {},
  ...overrides,
});
const keys = (items: RuleItem[]) => items.map((i) => i.key);
const rule = (items: RuleItem[], key: string) => items.find((i) => i.key === key);
const title = (items: RuleItem[], key: string) => rule(items, key)?.title;
const goalRule = (overrides: Partial<RuleContext["goals"][number]> = {}) => ({
  id: "g1",
  name: "Laptop",
  status: null,
  extraNeededCents: 0,
  targetIsEstimate: false,
  ...overrides,
});

describe("certainty (spec 5.7)", () => {
  test("a calculation takes the weakest input and never exceeds 4", () => {
    expect(derived([5, 2], "x")).toEqual({ level: 2, reason: "x" });
    expect(derived([5, 5], "x").level).toBe(4);
  });
});

describe("checklist rules (spec 5.8)", () => {
  test("deposit: key from the period start, title with the amount and payday, level 4", () => {
    const items = evaluateRules(ctx({ depositDueCents: 50000, nextPayday: "2026-10-29" }));
    expect(keys(items)).toContain("deposit:2026-09-29");
    expect(title(items, "deposit:2026-09-29")).toBe("Zet € 500,00 opzij op 29 oktober");
    expect(rule(items, "deposit:2026-09-29")).toMatchObject({ urgency: "week", certainty: { level: 4 } });
    expect(keys(evaluateRules(ctx({ depositDueCents: 0 })))).not.toContain("deposit:2026-09-29");
  });

  test("deposit without a payday (irregular income) drops the date; the day has no leading zero", () => {
    expect(title(evaluateRules(ctx({ depositDueCents: 50000 })), "deposit:2026-09-29")).toBe("Zet € 500,00 opzij");
    expect(title(evaluateRules(ctx({ depositDueCents: 50000, nextPayday: "2027-03-05" })), "deposit:2026-09-29")).toBe(
      "Zet € 500,00 opzij op 5 maart",
    );
  });

  test("budget warnings become week items", () => {
    const negative = evaluateRules(ctx({ warnings: [{ key: "negative_budget" }] }));
    expect(title(negative, "negative_budget")).toBe("Je geeft meer uit dan je verdient: kijk je vaste kosten na");
    expect(rule(negative, "negative_budget")).toMatchObject({ urgency: "week", certainty: { level: 4 } });
    const over = evaluateRules(ctx({ warnings: [{ key: "over_target", wantCents: 60000, roomCents: 50000 }] }));
    expect(title(over, "over_target")).toBe("Je wil € 600,00 sparen maar houdt € 500,00 over");
    expect(rule(over, "over_target")).toMatchObject({ urgency: "week", certainty: { level: 4 } });
  });

  test("standing order is always on offer; with a clean context it is the only item", () => {
    const items = evaluateRules(ctx({}));
    expect(keys(items)).toContain("standing_order");
    expect(keys(items)).toEqual(["standing_order"]);
    expect(rule(items, "standing_order")).toMatchObject({
      title: "Zet een automatische overschrijving klaar op je loondag",
      urgency: "month",
      certainty: { level: 4 },
    });
  });

  test("goal_unreachable: only for niet_haalbaar, with the extra amount", () => {
    const items = evaluateRules(ctx({ goals: [goalRule({ status: "niet_haalbaar", extraNeededCents: 70000 })] }));
    expect(title(items, "goal_unreachable:g1")).toBe("Spaar € 700,00 meer per maand of verschuif de deadline van Laptop");
    expect(rule(items, "goal_unreachable:g1")).toMatchObject({ urgency: "month", certainty: { level: 4 } });
    for (const status of ["op_schema", "krap", null] as const) {
      expect(keys(evaluateRules(ctx({ goals: [goalRule({ status })] })))).not.toContain("goal_unreachable:g1");
    }
  });

  test("goal_unreachable at the cap says saving alone is not enough", () => {
    const goals = [goalRule({ status: "niet_haalbaar", extraNeededCents: EXTRA_NEEDED_CAP })];
    expect(title(evaluateRules(ctx({ goals })), "goal_unreachable:g1")).toBe(
      "Verschuif de deadline van Laptop: met sparen alleen lukt het niet meer",
    );
  });

  test("estimate: a goal whose target is an estimate", () => {
    const items = evaluateRules(ctx({ goals: [goalRule({ id: "g2", name: "Rijbewijs", targetIsEstimate: true })] }));
    expect(rule(items, "estimate:g2")).toMatchObject({
      title: "Zoek de echte prijs van Rijbewijs op",
      urgency: "later",
      certainty: { level: 2 },
    });
    expect(keys(evaluateRules(ctx({ goals: [goalRule({ targetIsEstimate: false })] })))).not.toContain("estimate:g1");
  });

  test("prefs and income kinds", () => {
    expect(rule(evaluateRules(ctx({ prefs: { firstJob: true } })), "ziekenfonds")).toMatchObject({
      title: "Sluit aan bij een ziekenfonds als titularis",
      urgency: "month",
      certainty: { level: 3 },
    });
    expect(keys(evaluateRules(ctx({ prefs: { firstJob: false } })))).not.toContain("ziekenfonds");
    expect(keys(evaluateRules(ctx({ incomes: [income({ kind: "student" })] })))).toContain("student_hours");
    expect(keys(evaluateRules(ctx({ incomes: [income({ kind: "side" })] })))).toContain("side_income_tax");
    expect(keys(evaluateRules(ctx({ prefs: { noInterestSavings: true } })))).toContain("no_interest");
    expect(keys(evaluateRules(ctx({ incomes: [income({ kind: "salary" })] })))).toEqual(["standing_order"]);
  });

  test("income rules appear once, and not for inactive income", () => {
    const two = [income({ id: "a", kind: "student" }), income({ id: "b", kind: "student" })];
    expect(keys(evaluateRules(ctx({ incomes: two }))).filter((k) => k === "student_hours")).toHaveLength(1);
    expect(keys(evaluateRules(ctx({ incomes: [income({ kind: "student", active: false })] })))).not.toContain("student_hours");
  });

  test("ordered week, month, later", () => {
    const items = evaluateRules(
      ctx({
        depositDueCents: 50000,
        nextPayday: "2026-10-29",
        warnings: [{ key: "negative_budget" }],
        goals: [goalRule({ id: "g2", targetIsEstimate: true }), goalRule({ status: "niet_haalbaar", extraNeededCents: 100 })],
        prefs: { firstJob: true },
      }),
    );
    expect(keys(items)).toEqual([
      "deposit:2026-09-29",
      "negative_budget",
      "standing_order",
      "goal_unreachable:g1",
      "ziekenfonds",
      "estimate:g2",
    ]);
  });
});
