import { describe, expect, test } from "vitest";
import { buildDashboard } from "@/domain/dashboard";
import { haider } from "@/domain/fixtures/personas";
import { goal, income } from "@/domain/test-helpers";
import type { Goal } from "@/domain/types";
import { draftGoals, effectOf, previewInputs, type Draft } from "./effect";

// Haider on 20 oct 2026: 430 a month, the period starts in sep 2026, the fund is full in nov 2026 and the trip in
// mei 2027 (hand-checked in dashboard.test.ts). The deadline of the trip is aug 2027.
const today = "2026-10-20";
const base = () => buildDashboard(haider, today).projectionInput;
const draft = (over: Partial<Draft> = {}): Draft => ({ name: "Laptop", target: "1200", deadline: "", ...over });
const run = (over: Partial<Draft> = {}, goals = base().goals, existing: Goal | null = null) => {
  const after = draftGoals(goals, draft(over), existing);
  if (!after) throw new Error("draft is not valid");
  const inputs = previewInputs({ ...base(), goals }, after, null);
  return effectOf(inputs.before, inputs.after);
};

describe("draftGoals", () => {
  test("a new goal goes last, empty, without deadline or main flag", () => {
    const after = draftGoals(haider.goals, draft(), null)!;
    expect(after).toHaveLength(3);
    expect(after[2]).toMatchObject({ name: "Laptop", targetCents: 120000, balanceCents: 0, deadline: null, priority: 3, weight: 1, isMain: false, archived: false });
    expect(after[2].createdAt > haider.goals[1].createdAt).toBe(true);
  });

  test("a deadline is a month", () => {
    expect(draftGoals(haider.goals, draft({ deadline: "2027-03" }), null)![2].deadline).toEqual({ year: 2027, month: 3 });
  });

  test("an existing goal is replaced in place and keeps its balance, weight and place", () => {
    const reis = { ...haider.goals[1], balanceCents: 5000, weight: 3 };
    const after = draftGoals([haider.goals[0], reis], draft({ name: "Reis naar Rome", target: "2.000,50", deadline: "2027-08" }), reis)!;
    expect(after).toHaveLength(2);
    expect(after[1]).toMatchObject({ id: "reis", name: "Reis naar Rome", targetCents: 200050, balanceCents: 5000, weight: 3, isMain: true });
  });

  test("not enough to preview yet gives null", () => {
    expect(draftGoals(haider.goals, draft({ name: "  " }), null)).toBeNull();
    expect(draftGoals(haider.goals, draft({ target: "" }), null)).toBeNull();
    expect(draftGoals(haider.goals, draft({ target: "0" }), null)).toBeNull();
    expect(draftGoals(haider.goals, draft({ target: "abc" }), null)).toBeNull();
    expect(draftGoals(haider.goals, draft({ deadline: "2027" }), null)).toBeNull();
    expect(draftGoals(haider.goals, draft({ deadline: "2027-13" }), null)).toBeNull();
  });
});

describe("effectOf (spec 5.4)", () => {
  test("a new goal without deadline: when it is full and which goal slips, in words", () => {
    const e = run();
    expect(e.subject).toMatchObject({ name: "Laptop", headline: "Klaar rond jun 2027", status: null, advice: null });
    // After the fund, the trip only gets what it needs per month (€ 250); the rest goes to the laptop.
    expect(e.shifts).toEqual(["Reis schuift 2 maanden op, van mei 2027 naar jul 2027"]);
  });

  test("a goal that takes all the room until the deadline pushes the trip to its deadline", () => {
    const e = run({ target: "1500" });
    expect(e.subject?.headline).toBe("Klaar rond aug 2027");
    expect(e.shifts).toEqual(["Reis schuift 3 maanden op, van mei 2027 naar aug 2027"]);
  });

  test("a goal that gets room makes another one come earlier", () => {
    const big = draftGoals(base().goals, draft({ target: "5000" }), null)!;
    const e = run({ target: "300" }, big, big[2]);
    expect(e.subject?.headline).toMatch(/^Klaar rond [a-z]{3} 2027 \(was /);
    expect(e.shifts).toHaveLength(1);
    expect(e.shifts[0]).toMatch(/^Reis komt \d+ maand(en)? vroeger, van aug 2027 naar [a-z]{3} 2027$/);
  });

  test("one month is singular", () => {
    const e = run({ target: "500" });
    expect(e.subject?.headline).toBe("Klaar rond feb 2027");
    expect(e.shifts).toEqual(["Reis schuift 1 maand op, van mei 2027 naar jun 2027"]);
  });

  test("a deadline already passed cannot be met: shift the deadline", () => {
    const e = run({ deadline: "2026-01" });
    expect(e.subject?.status).toBe("niet_haalbaar");
    expect(e.subject?.advice).toBe("Verschuif de deadline van Laptop: met sparen alleen lukt het niet meer");
  });

  test("a deadline in the current month still names the extra amount per month", () => {
    const e = run({ deadline: "2026-09" });
    expect(e.subject?.status).toBe("niet_haalbaar");
    expect(e.subject?.advice).toBe("Spaar € 1.770,00 meer per maand of verschuif de deadline van Laptop");
  });

  test("a goal that is on schedule has a status and no advice", () => {
    const e = run({ deadline: "2028-12" });
    expect(e.subject).toMatchObject({ status: "op_schema", advice: null });
  });

  test("editing the trip: its own line shows the old month, it is not repeated among the others", () => {
    const reis = base().goals[1];
    const e = run({ name: "Reis", target: "1500", deadline: "2027-08" }, base().goals, reis);
    expect(e.subject?.headline).toMatch(/^Klaar rond [a-z]{3} 2027 \(was mei 2027\)$/);
    expect(e.shifts).toEqual([]);
  });

  test("nothing changed: nothing to say", () => {
    const goals = base().goals;
    const inputs = previewInputs({ ...base(), goals }, goals, null);
    expect(effectOf(inputs.before, inputs.after)).toEqual({ subject: null, shifts: [] });
  });

  test("a goal that never gets full within the horizon says so", () => {
    const e = run({ target: "9999999" });
    expect(e.subject?.headline).toBe("Niet vol binnen 10 jaar");
  });
});

describe("previewInputs: both sides on the same horizon", () => {
  const far = (pensioen = true) => {
    const goals: Goal[] = pensioen ? [...base().goals, { ...goal("pensioen", 6_000_000, { priority: 3 }), name: "Pensioen" }] : base().goals;
    const after = draftGoals(goals, draft({ name: "Boek", target: "50", deadline: "2046-12" }), null)!;
    return { goals, ...previewInputs({ ...base(), goals }, after, null) };
  };

  test("the longer horizon goes to both", () => {
    const { before, after } = far();
    expect(before.horizon).toBe(after.horizon);
    expect(before.horizon).toBeGreaterThan(120);
  });

  test("a goal that only fits the longer horizon is not reported as newly full", () => {
    const e = effectOf(far().before, far().after);
    expect(e.shifts.join(" ")).not.toMatch(/wordt|niet meer|gaat van/);
  });

  test("yearly income is counted for that horizon, not for the shorter one", () => {
    const yearly = income({ id: "dertiende", frequency: "yearly", month: 12, amountCents: 100000 });
    const goals = base().goals;
    const after = draftGoals(goals, draft({ deadline: "2046-12" }), null)!;
    const { before, after: next } = previewInputs({ ...base(), goals }, after, { incomes: [yearly], periodStart: "2026-09-29" });
    expect(before.oneOffs).toEqual(next.oneOffs);
    expect(before.oneOffs.at(-1)?.month.year).toBeGreaterThanOrEqual(2046);
  });

  test("without the one-off income setting there are none", () => {
    const { before } = far();
    expect(before.oneOffs).toEqual([]);
  });
});
