import { describe, expect, test } from "vitest";
import { buildDashboard } from "./dashboard";
import { freelancer, gezin, haider, student, tiener, zayd } from "./fixtures/personas";
import { horizonFor } from "./projection";
import { emergency, goal, income } from "./test-helpers";

const today = "2026-10-20";
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
const keys = (d: ReturnType<typeof buildDashboard>) => d.rules.map((r) => r.key);

describe("buildDashboard: personas (spec 3)", () => {
  test("Haider: standard savings proposal when there are no budget lines and no plan amount", () => {
    const h = buildDashboard(haider, today);
    expect(h.nextPayday).toBe("2026-10-29");
    expect(h.daysToPayday).toBe(9);
    expect(h.savingsCents).toBe(43000);
    expect(sum(h.depositPrefill)).toBe(43000);
    expect(h.mainGoal?.kind).toBe("trip");
  });

  test("Zayd: long horizon, main goal waits for the emergency fund", () => {
    const d = buildDashboard(zayd, today);
    expect(horizonFor(zayd.goals, d.period.month)).toBeGreaterThan(120);
    expect(d.savingsCents).toBe(100000); // follows the room: 2.200 - 1.000 - 200
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
  });

  test("Gezin: goals with a status, and no budget warning", () => {
    const d = buildDashboard(gezin, today);
    expect(d.goals.length).toBeGreaterThan(0);
    expect(d.warnings).toEqual([]);
    expect(d.goals.find((g) => g.name === "Studiekosten")?.status).not.toBeNull();
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
    expect(d.warnings).toEqual([]);
  });

  test("deposits already booked reduce what is still due, per goal and in total", () => {
    const goals = haider.goals.map((g) => (g.id === "nood" ? { ...g, balanceCents: 10000 } : g)); // balances hold the deposit
    const d = buildDashboard({ ...haider, goals, depositsThisPeriod: { nood: 10000 } }, today);
    expect(d.depositPrefill.nood).toBe(33000);
    expect(sum(d.depositPrefill)).toBe(33000);
    expect(d.goals.find((g) => g.id === "nood")?.allocatedCents).toBe(43000);
    expect(keys(d)).toContain("deposit:2026-09-29");
    const all = haider.goals.map((g) => (g.id === "nood" ? { ...g, balanceCents: 43000 } : g));
    const done = buildDashboard({ ...haider, goals: all, depositsThisPeriod: { nood: 43000 } }, today);
    expect(sum(done.depositPrefill)).toBe(0);
    expect(keys(done).some((k) => k.startsWith("deposit:"))).toBe(false);
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
