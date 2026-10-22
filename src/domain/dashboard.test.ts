import { describe, expect, test } from "vitest";
import { buildDashboard, depositsInPeriod } from "./dashboard";
import { freelancer, gezin, haider, student, tiener, zayd } from "./fixtures/personas";
import { EXTRA_NEEDED_CAP, horizonFor } from "./projection";
import { emergency, goal, income, plan } from "./test-helpers";

const today = "2026-10-20";
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
const keys = (d: ReturnType<typeof buildDashboard>) => d.rules.map((r) => r.key);
const depositTitle = (d: ReturnType<typeof buildDashboard>) => d.rules.find((r) => r.key.startsWith("deposit:"))?.title;

describe("buildDashboard: personas (spec 3)", () => {
  test("Haider: standard savings proposal when there are no budget lines and no plan amount", () => {
    const h = buildDashboard(haider, today);
    expect(h.nextPayday).toBe("2026-10-29");
    expect(h.daysToPayday).toBe(9);
    expect(h.savingsCents).toBe(43000);
    expect(sum(h.depositPrefill)).toBe(43000);
    expect(h.savingsIsProposal).toBe(true);
    expect(h.mainGoal?.kind).toBe("trip");
    expect(h.rules.find((r) => r.key === "estimate:nood")?.title).toBe("Kijk na of je noodfonds groot genoeg is");
  });

  test("Zayd: long horizon, main goal waits for the emergency fund", () => {
    const d = buildDashboard(zayd, today);
    expect(horizonFor(zayd.goals, d.period.month)).toBeGreaterThan(120);
    expect(d.savingsCents).toBe(100000); // follows the room: 2.200 - 1.000 - 200
    expect(d.savingsIsProposal).toBe(false);
    expect(d.mainGoal?.name).toBe("Hijra");
    expect(d.mainGoalWaitsFor).toEqual({ goalName: "Noodfonds", fill: { year: 2026, month: 12 } });
    expect(keys(d)).toContain("no_interest");
  });

  test("Student and tiener: no fixed payday", () => {
    for (const p of [student, tiener]) {
      const d = buildDashboard(p, today);
      expect(d.nextPayday).toBeNull();
      expect(d.daysToPayday).toBeNull();
      expect(d.period.start).toBe("2026-10-01");
    }
    expect(keys(buildDashboard(student, today))).toContain("student_hours");
    for (const p of [student, tiener]) expect(keys(buildDashboard(p, today))).not.toContain("standing_order");
  });

  test("every persona has concrete fill months (hand-checked against the savings amount)", () => {
    const fill = (p: typeof zayd, id: string) => buildDashboard(p, today).goals.find((g) => g.id === id)?.fill;
    expect(fill(zayd, "nood")).toEqual({ year: 2026, month: 12 }); // 3.400 to go at 1.000 a month
    expect(fill(haider, "nood")).toEqual({ year: 2026, month: 11 });
    expect(fill(haider, "reis")).toEqual({ year: 2027, month: 5 }); // 3.500 to save in total at 430 a month
    expect(fill(student, "reis")).toEqual({ year: 2027, month: 2 }); // 850 in total at 195 a month
    expect(fill(gezin, "nood")).toEqual({ year: 2027, month: 2 }); // 2.650 to go at 500 a month
    expect(fill(tiener, "nood")).toEqual({ year: 2026, month: 12 });
    expect(fill(freelancer, "nood")).toEqual({ year: 2026, month: 12 }); // careful: 850 a month
  });

  test("Tiener: the horizon is exposed and the driving licence is not within it", () => {
    const d = buildDashboard(tiener, today);
    expect(d.horizon).toBe(120);
    expect(d.goals.find((g) => g.id === "rijbewijs")?.fill).toBeNull();
  });

  test("personas do not share mutable defaults", () => {
    expect(zayd.closedRuleKeys).not.toBe(haider.closedRuleKeys);
    expect(zayd.depositsThisPeriod).not.toBe(haider.depositsThisPeriod);
  });

  test("Gezin: goals with a status, and no budget warning", () => {
    const d = buildDashboard(gezin, today);
    expect(d.goals.length).toBeGreaterThan(0);
    expect(d.warnings).toEqual([]);
    expect(d.goals.find((g) => g.name === "Studiekosten")?.status).not.toBeNull();
    expect(d.savingsIsProposal).toBe(false); // plan amount and budget lines
  });

  test("Freelancer: tax rule and a tax pot without deadline", () => {
    const d = buildDashboard(freelancer, today);
    expect(keys(d)).toContain("side_income_tax");
    expect(d.goals.find((g) => g.name === "Belasting")?.deadline).toBeNull();
  });
});

describe("buildDashboard: assembly", () => {
  test("no incomes: no payday, no savings, the emergency fund is the main goal", () => {
    const empty = buildDashboard({ ...haider, incomes: [], lines: [], goals: [emergency(100000)] }, today);
    expect(empty.nextPayday).toBeNull();
    expect(empty.savingsCents).toBe(0);
    expect(empty.mainGoal?.kind).toBe("emergency");
    expect(empty.mainGoalWaitsFor).toBeNull();
  });

  test("closed rule keys are hidden", () => {
    expect(keys(buildDashboard(haider, today))).toContain("standing_order");
    expect(keys(buildDashboard({ ...haider, closedRuleKeys: ["standing_order"] }, today))).not.toContain("standing_order");
  });

  test("payday today is 0 days away; progress is the share of the period passed", () => {
    const d = buildDashboard(haider, "2026-10-29");
    expect(d.daysToPayday).toBe(0);
    expect(d.progress).toBe(0);
    expect(buildDashboard(haider, "2026-10-20").progress).toBeCloseTo(21 / 30);
  });

  test("a plan amount wins over the proposal, even without budget lines", () => {
    const d = buildDashboard({ ...haider, plan: { ...haider.plan, monthlySavingsCents: 20000 } }, today);
    expect(d.savingsCents).toBe(20000);
    expect(d.savingsIsProposal).toBe(false);
    expect(d.warnings).toEqual([]);
  });

  test("deposits already booked reduce what is still due, per goal and in total", () => {
    const goals = haider.goals.map((g) => (g.id === "nood" ? { ...g, balanceCents: 10000 } : g)); // balances hold the deposit
    const d = buildDashboard({ ...haider, goals, depositsThisPeriod: { nood: 10000 } }, today);
    expect(d.depositPrefill.nood).toBe(33000);
    expect(sum(d.depositPrefill)).toBe(33000);
    expect(d.goals.find((g) => g.id === "nood")?.allocatedCents).toBe(43000);
    expect(depositTitle(d)).toBe("Zet \u20ac\u00a0330,00 opzij op 29 oktober");
    const all = haider.goals.map((g) => (g.id === "nood" ? { ...g, balanceCents: 43000 } : g));
    const done = buildDashboard({ ...haider, goals: all, depositsThisPeriod: { nood: 43000 } }, today);
    expect(sum(done.depositPrefill)).toBe(0);
    expect(keys(done).some((k) => k.startsWith("deposit:"))).toBe(false);
  });

  test("deposits on an archived goal count as saved, and the deposit rule agrees with the prefill", () => {
    const goals = [...haider.goals, goal("oud", 50000, { archived: true, balance: 10000 })];
    const d = buildDashboard({ ...haider, goals, depositsThisPeriod: { oud: 10000 } }, today);
    expect(sum(d.depositPrefill)).toBe(33000);
    expect(depositTitle(d)).toBe("Zet \u20ac\u00a0330,00 opzij op 29 oktober");
  });

  test("the main goal does not wait for an emergency fund that gets nothing", () => {
    const none = buildDashboard({ ...haider, plan: { ...haider.plan, monthlySavingsCents: 0 } }, today);
    expect(none.savingsCents).toBe(0);
    expect(none.mainGoalWaitsFor).toBeNull();
  });

  test("main goal gets money when the emergency share is below 100 %", () => {
    const d = buildDashboard({ ...haider, plan: { ...haider.plan, emergencySharePct: 50 } }, today);
    expect(d.mainGoal?.allocatedCents).toBeGreaterThan(0);
    expect(d.mainGoalWaitsFor).toBeNull();
  });

  test("a full emergency fund does not hold the main goal back", () => {
    const goals = haider.goals.map((g) => (g.kind === "emergency" ? { ...g, balanceCents: g.targetCents } : g));
    const d = buildDashboard({ ...haider, goals }, today);
    expect(d.mainGoalWaitsFor).toBeNull();
    expect(d.goals.find((g) => g.kind === "emergency")?.isFull).toBe(true);
    expect(d.goals.find((g) => g.kind === "emergency")?.fill).toBe("full");
  });

  test("archived goals are left out", () => {
    const d = buildDashboard({ ...haider, goals: [...haider.goals, goal("oud", 5000, { archived: true })] }, today);
    expect(d.goals.map((g) => g.id)).not.toContain("oud");
    expect(d.depositPrefill).not.toHaveProperty("oud");
  });

  test("one-off income only reaches the projection when the plan says so", () => {
    const bonus = income({ id: "13de", frequency: "yearly", month: 12, amountCents: 150000, paydayRule: { type: "irregular" } });
    const base = { ...haider, incomes: [...haider.incomes, bonus] };
    expect(buildDashboard(base, today).projectionInput.oneOffs).toEqual([]);
    const on = buildDashboard({ ...base, plan: { ...base.plan, includeOneOffIncome: true } }, today);
    expect(on.projectionInput.oneOffs[0]).toEqual({ month: { year: 2026, month: 12 }, cents: 150000 });
  });
});

describe("buildDashboard: one-off income in the current period (spec 5.4)", () => {
  const bonus = income({ id: "13de", frequency: "yearly", month: 9, amountCents: 150000, paydayRule: { type: "irregular" } }); // Haider's period starts in september
  const data = { ...haider, incomes: [...haider.incomes, bonus], plan: { ...haider.plan, includeOneOffIncome: true } };

  test("the deposit prefill includes the bonus", () => {
    const d = buildDashboard(data, today);
    expect(d.period.month).toEqual({ year: 2026, month: 9 });
    expect(sum(d.depositPrefill)).toBe(43000 + 150000);
    expect(depositTitle(d)).toBe("Zet \u20ac\u00a01.930,00 opzij op 29 oktober");
  });

  test("deposits above the savings are covered by the bonus first", () => {
    const goals = haider.goals.map((g) => (g.id === "nood" ? { ...g, balanceCents: 50000 } : g));
    const d = buildDashboard({ ...data, goals, depositsThisPeriod: { nood: 50000 } }, today);
    expect(sum(d.depositPrefill)).toBe(43000 + 150000 - 50000);
  });
});

describe("depositsInPeriod", () => {
  const period = { start: "2026-09-29", end: "2026-10-28", month: { year: 2026, month: 9 } };
  const tx = (goalId: string, amountCents: number, occurredOn: string, source: "manual" | "start" | "import" | "ai" = "manual") => ({ goalId, amountCents, occurredOn, source });

  test("only transactions inside the period, edges included; the start balance is not a deposit", () => {
    const txs = [
      tx("nood", 10000, "2026-09-29"),
      tx("nood", 5000, "2026-10-28", "import"),
      tx("nood", 99999, "2026-09-28"),
      tx("nood", 99999, "2026-10-29"),
      tx("nood", 20000, "2026-10-01", "start"),
      tx("reis", 3000, "2026-10-10", "ai"),
    ];
    expect(depositsInPeriod(txs, period)).toEqual({ nood: 15000, reis: 3000 });
  });

  test("a withdrawal nets off and a goal never goes below 0", () => {
    expect(depositsInPeriod([tx("nood", 10000, "2026-10-01"), tx("nood", -4000, "2026-10-02")], period)).toEqual({ nood: 6000 });
    expect(depositsInPeriod([tx("nood", 2000, "2026-10-01"), tx("nood", -8000, "2026-10-02")], period)).toEqual({ nood: 0 });
  });

  test("buildDashboard clamps a negative booked value as a second guard: the prefill does not rise", () => {
    const clean = buildDashboard(haider, today);
    const negative = buildDashboard({ ...haider, depositsThisPeriod: { nood: -5000 } }, today);
    expect(negative.depositPrefill).toEqual(clean.depositPrefill);
    expect(negative.goals.map((g) => g.allocatedCents)).toEqual(clean.goals.map((g) => g.allocatedCents));
  });
});

describe("buildDashboard: past deadline (spec 5.3)", () => {
  test("a deadline before the first period asks for the whole rest now and is not feasible", () => {
    const data = { ...haider, incomes: [income()], lines: [], plan: plan({ monthlySavingsCents: 50000 }), goals: [goal("laptop", 10000, { deadline: { year: 2026, month: 6 } })] };
    const d = buildDashboard(data, "2026-11-26");
    expect(d.period.month).toEqual({ year: 2026, month: 11 });
    const laptop = d.goals[0];
    expect(laptop.status).toBe("niet_haalbaar");
    expect(laptop.extraNeededCents).toBe(EXTRA_NEEDED_CAP);
    expect(d.rules.find((r) => r.key === "goal_unreachable:laptop")?.title).toBe("Verschuif de deadline van laptop: met sparen alleen lukt het niet meer");
  });
});

describe("buildDashboard: certainty (spec 5.7)", () => {
  const confirmed = { ...haider, plan: plan({ monthlySavingsCents: 20000 }) }; // plan amount, fixed income, no estimates

  test("a proposal is a schatting, and it reaches the goals and the deposit rule", () => {
    const d = buildDashboard(haider, today);
    expect(d.savingsCertainty).toEqual({ level: 2, reason: "Schatting: voorstel van 20 %" });
    expect(d.goals.every((g) => g.fillCertainty.level === 2)).toBe(true);
    expect(d.rules.find((r) => r.key.startsWith("deposit:"))?.certainty.level).toBe(2);
  });

  test("confirmed inputs give level 4; a goal whose target is an estimate drops to 2", () => {
    const d = buildDashboard(confirmed, today);
    expect(d.savingsCertainty).toEqual({ level: 4, reason: "Op basis van jouw invoer" });
    expect(d.rules.find((r) => r.key.startsWith("deposit:"))?.certainty.level).toBe(4);
    const goals = confirmed.goals.map((g) => (g.id === "nood" ? { ...g, targetIsEstimate: false } : g));
    const views = buildDashboard({ ...confirmed, goals }, today).goals;
    expect(views.find((g) => g.id === "nood")?.fillCertainty.level).toBe(4);
    expect(views.find((g) => g.id === "reis")?.fillCertainty).toEqual({ level: 2, reason: "Schatting: doelbedrag" });
  });

  test("variable or estimated income and estimated budget lines each make it a schatting; inactive income does not", () => {
    expect(buildDashboard(student, today).savingsCertainty).toEqual({ level: 2, reason: "Schatting: inkomen, uitgaven" });
    expect(buildDashboard(zayd, today).savingsCertainty).toEqual({ level: 2, reason: "Schatting: uitgaven" });
    const inactive = income({ id: "oud", variability: "variable", isEstimate: true, active: false });
    expect(buildDashboard({ ...confirmed, incomes: [...confirmed.incomes, inactive] }, today).savingsCertainty.level).toBe(4);
  });
});
